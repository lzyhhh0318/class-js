import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db.js';
const router = Router();
const ALLOWED_EXTENSIONS = {
    ppt: ['.ppt', '.pptx'],
    pdf: ['.pdf'],
    word: ['.doc', '.docx'],
    video: ['.mp4', '.avi', '.mov'],
    image: ['.jpg', '.jpeg', '.png', '.gif'],
    archive: ['.zip', '.rar', '.7z'],
};
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${uuidv4()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allAllowed = Object.values(ALLOWED_EXTENSIONS).flat();
        if (allAllowed.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`不支持的文件格式: ${ext}`));
        }
    },
});
function detectMaterialType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    for (const [type, exts] of Object.entries(ALLOWED_EXTENSIONS)) {
        if (exts.includes(ext))
            return type;
    }
    return 'pdf';
}
function computeMd5(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}
router.get('/courses', (_req, res) => {
    const courses = Array.from(db.courses.values());
    res.json({ success: true, data: courses });
});
router.get('/courses/:courseId', (req, res) => {
    const course = db.courses.get(req.params.courseId);
    if (!course) {
        res.status(404).json({ success: false, error: '课程不存在' });
        return;
    }
    res.json({ success: true, data: course });
});
router.get('/materials', (req, res) => {
    const { courseId, chapterId, type, category, userId } = req.query;
    let materials = Array.from(db.materials.values());
    if (courseId)
        materials = materials.filter(m => m.courseId === courseId);
    if (chapterId)
        materials = materials.filter(m => m.chapterId === chapterId);
    if (type)
        materials = materials.filter(m => m.type === type);
    if (category)
        materials = materials.filter(m => m.category === category);
    if (userId) {
        const user = db.users.get(userId);
        if (user && user.role === 'student') {
            materials = materials.filter(m => {
                if (m.visibility === 'public')
                    return true;
                if (m.visibility === 'course')
                    return user.courseIds.includes(m.courseId);
                return false;
            });
        }
    }
    res.json({ success: true, data: materials });
});
router.get('/materials/:id', (req, res) => {
    const material = db.materials.get(req.params.id);
    if (!material) {
        res.status(404).json({ success: false, error: '资料不存在' });
        return;
    }
    db.accessLogs.push({
        id: uuidv4(),
        userId: req.query.userId || 'anonymous',
        userName: req.query.userName || '匿名',
        resourceType: 'material',
        resourceId: material.id,
        action: 'view',
        timestamp: new Date().toISOString(),
    });
    res.json({ success: true, data: material });
});
router.post('/materials', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({ success: false, error: '请上传文件' });
        return;
    }
    try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    }
    catch { }
    const { courseId, chapterId, title, description, visibility, userId, category } = req.body;
    if (!courseId || !chapterId || !title) {
        res.status(400).json({ success: false, error: '缺少必要参数' });
        return;
    }
    const course = db.courses.get(courseId);
    if (!course) {
        res.status(404).json({ success: false, error: '课程不存在' });
        return;
    }
    const md5 = computeMd5(require('fs').readFileSync(file.path));
    const existingByMd5 = Array.from(db.materials.values()).find(m => m.versions.some(v => v.md5 === md5));
    if (existingByMd5) {
        res.status(409).json({ success: false, error: '文件已存在（MD5重复）', existingId: existingByMd5.id });
        return;
    }
    const detectedType = detectMaterialType(file.originalname);
    const materialId = uuidv4();
    const version = {
        id: uuidv4(),
        materialId,
        version: 1,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId || 'teacher-1',
        md5,
    };
    const material = {
        id: materialId,
        courseId,
        chapterId,
        title,
        type: detectedType,
        category: category || (detectedType === 'video' ? 'recording' : 'courseware'),
        description: description || '',
        visibility: visibility || 'course',
        currentVersion: 1,
        versions: [version],
        parsedContent: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId || 'teacher-1',
    };
    db.materials.set(materialId, material);
    db.notificationQueue.push({
        type: 'material_upload',
        courseId,
        resourceId: materialId,
        message: `新资料已上传: ${title}`,
        timestamp: new Date().toISOString(),
    });
    db.accessLogs.push({
        id: uuidv4(),
        userId: userId || 'teacher-1',
        userName: '教师',
        resourceType: 'material',
        resourceId: materialId,
        action: 'upload',
        timestamp: new Date().toISOString(),
    });
    res.status(201).json({ success: true, data: material });
});
router.put('/materials/:id', upload.single('file'), (req, res) => {
    const material = db.materials.get(req.params.id);
    if (!material) {
        res.status(404).json({ success: false, error: '资料不存在' });
        return;
    }
    const { title, description, visibility, userId } = req.body;
    if (title)
        material.title = title;
    if (description)
        material.description = description;
    if (visibility)
        material.visibility = visibility;
    if (req.file) {
        try {
            req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        }
        catch { }
        const md5 = computeMd5(require('fs').readFileSync(req.file.path));
        const newVersionNum = material.currentVersion + 1;
        const version = {
            id: uuidv4(),
            materialId: material.id,
            version: newVersionNum,
            fileName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: userId || 'teacher-1',
            md5,
        };
        material.versions.push(version);
        material.currentVersion = newVersionNum;
        db.notificationQueue.push({
            type: 'material_update',
            courseId: material.courseId,
            resourceId: material.id,
            message: `资料已更新: ${material.title} (v${newVersionNum})`,
            timestamp: new Date().toISOString(),
        });
    }
    material.updatedAt = new Date().toISOString();
    db.materials.set(material.id, material);
    res.json({ success: true, data: material });
});
router.get('/materials/:id/versions', (req, res) => {
    const material = db.materials.get(req.params.id);
    if (!material) {
        res.status(404).json({ success: false, error: '资料不存在' });
        return;
    }
    res.json({ success: true, data: material.versions });
});
router.post('/materials/:id/revert/:version', (req, res) => {
    const material = db.materials.get(req.params.id);
    if (!material) {
        res.status(404).json({ success: false, error: '资料不存在' });
        return;
    }
    const targetVersion = parseInt(req.params.version);
    const versionData = material.versions.find(v => v.version === targetVersion);
    if (!versionData) {
        res.status(404).json({ success: false, error: '版本不存在' });
        return;
    }
    material.currentVersion = targetVersion;
    material.updatedAt = new Date().toISOString();
    db.materials.set(material.id, material);
    res.json({ success: true, data: material });
});
router.get('/materials/:id/download', (req, res) => {
    const material = db.materials.get(req.params.id);
    if (!material) {
        res.status(404).json({ success: false, error: '资料不存在' });
        return;
    }
    const version = parseInt(req.query.version) || material.currentVersion;
    const versionData = material.versions.find(v => v.version === version);
    if (!versionData) {
        res.status(404).json({ success: false, error: '版本不存在' });
        return;
    }
    db.accessLogs.push({
        id: uuidv4(),
        userId: req.query.userId || 'anonymous',
        userName: req.query.userName || '匿名',
        resourceType: 'material',
        resourceId: material.id,
        action: 'download',
        timestamp: new Date().toISOString(),
    });
    res.json({
        success: true,
        data: {
            downloadUrl: versionData.filePath,
            fileName: versionData.fileName,
            fileSize: versionData.fileSize,
            version: versionData.version,
        },
    });
});
router.delete('/materials/:id', (req, res) => {
    const material = db.materials.get(req.params.id);
    if (!material) {
        res.status(404).json({ success: false, error: '资料不存在' });
        return;
    }
    db.materials.delete(req.params.id);
    res.json({ success: true, message: '资料已删除' });
});
export default router;
