import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { db } from '../db.js';
const router = Router();
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads', 'submissions'));
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
router.get('/', (req, res) => {
    const { courseId, chapterId, status } = req.query;
    let assignments = Array.from(db.assignments.values());
    if (courseId)
        assignments = assignments.filter(a => a.courseId === courseId);
    if (chapterId)
        assignments = assignments.filter(a => a.chapterId === chapterId);
    if (status)
        assignments = assignments.filter(a => a.status === status);
    assignments.forEach(a => {
        if (new Date(a.deadline) < new Date() && a.status === 'active') {
            a.status = 'closed';
            a.submissions.forEach(s => { if (s.status === 'submitted')
                s.status = 'overdue'; });
        }
    });
    res.json({ success: true, data: assignments });
});
router.get('/:id', (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    if (new Date(assignment.deadline) < new Date() && assignment.status === 'active')
        assignment.status = 'closed';
    res.json({ success: true, data: assignment });
});
router.post('/', (req, res) => {
    const { courseId, chapterId, title, description, deadline, allowedFormats, maxFileSize, submissionMode, maxGroupSize, userId } = req.body;
    if (!courseId || !title || !deadline) {
        res.status(400).json({ success: false, error: '缺少必要参数' });
        return;
    }
    const course = db.courses.get(courseId);
    if (!course) {
        res.status(404).json({ success: false, error: '课程不存在' });
        return;
    }
    const assignment = {
        id: uuidv4(), courseId, chapterId: chapterId || '', title, description: description || '',
        deadline, allowedFormats: allowedFormats || ['.pdf', '.doc', '.docx', '.zip'],
        maxFileSize: maxFileSize || 10485760,
        submissionMode: submissionMode || 'individual',
        maxGroupSize: maxGroupSize || (submissionMode === 'group' ? 4 : 1),
        status: 'active', createdBy: userId || 'teacher-1', createdAt: new Date().toISOString(), submissions: [],
    };
    db.assignments.set(assignment.id, assignment);
    db.notificationQueue.push({ type: 'assignment_publish', courseId, resourceId: assignment.id, message: `新作业已发布: ${title}`, timestamp: new Date().toISOString() });
    res.status(201).json({ success: true, data: assignment });
});
router.put('/:id', (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    const { title, description, deadline, allowedFormats, maxFileSize, submissionMode, maxGroupSize, status } = req.body;
    if (title)
        assignment.title = title;
    if (description)
        assignment.description = description;
    if (deadline)
        assignment.deadline = deadline;
    if (allowedFormats)
        assignment.allowedFormats = allowedFormats;
    if (maxFileSize)
        assignment.maxFileSize = maxFileSize;
    if (submissionMode)
        assignment.submissionMode = submissionMode;
    if (maxGroupSize)
        assignment.maxGroupSize = maxGroupSize;
    if (status)
        assignment.status = status;
    db.assignments.set(assignment.id, assignment);
    res.json({ success: true, data: assignment });
});
router.delete('/:id', (req, res) => {
    if (!db.assignments.has(req.params.id)) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    db.assignments.delete(req.params.id);
    res.json({ success: true, message: '作业已删除' });
});
router.post('/:id/submit', upload.single('file'), (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    const file = req.file;
    if (!file) {
        res.status(400).json({ success: false, error: '请上传作业文件' });
        return;
    }
    try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    }
    catch { }
    const { studentId, studentName, groupId, groupName, groupMembers } = req.body;
    if (!studentId) {
        res.status(400).json({ success: false, error: '缺少学生ID' });
        return;
    }
    if (new Date(assignment.deadline) < new Date()) {
        res.status(403).json({ success: false, error: '作业已截止，无法提交' });
        return;
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (assignment.allowedFormats.length > 0 && !assignment.allowedFormats.includes(ext)) {
        res.status(400).json({ success: false, error: `不支持的文件格式: ${ext}` });
        return;
    }
    if (file.size > assignment.maxFileSize) {
        res.status(400).json({ success: false, error: `文件大小超过限制` });
        return;
    }
    const parsedMembers = groupMembers ? (typeof groupMembers === 'string' ? JSON.parse(groupMembers) : groupMembers) : [];
    const existingIndex = assignment.submissions.findIndex(s => {
        if (assignment.submissionMode === 'group' && groupId)
            return s.groupId === groupId;
        return s.studentId === studentId;
    });
    const submission = {
        id: uuidv4(), assignmentId: assignment.id, studentId, studentName: studentName || '学生',
        groupId: groupId || null, groupName: groupName || null, groupMembers: parsedMembers,
        fileName: file.originalname, filePath: file.path, fileSize: file.size,
        status: existingIndex >= 0 ? 'resubmitted' : 'submitted',
        score: null, feedback: null, submittedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0)
        assignment.submissions[existingIndex] = submission;
    else
        assignment.submissions.push(submission);
    db.assignments.set(assignment.id, assignment);
    db.accessLogs.push({ id: uuidv4(), userId: studentId, userName: studentName || '学生', resourceType: 'assignment', resourceId: assignment.id, action: 'submit', timestamp: new Date().toISOString() });
    res.status(201).json({ success: true, data: submission });
});
router.get('/:id/submissions', (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    const { studentId, groupId } = req.query;
    let subs = assignment.submissions;
    if (studentId)
        subs = subs.filter(s => s.studentId === studentId || s.groupMembers?.includes(studentId));
    if (groupId)
        subs = subs.filter(s => s.groupId === groupId);
    res.json({ success: true, data: subs });
});
router.post('/:id/submissions/:submissionId/grade', (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    const submission = assignment.submissions.find(s => s.id === req.params.submissionId);
    if (!submission) {
        res.status(404).json({ success: false, error: '提交记录不存在' });
        return;
    }
    const { score, feedback } = req.body;
    if (score !== undefined)
        submission.score = score;
    if (feedback !== undefined)
        submission.feedback = feedback;
    submission.status = 'graded';
    db.assignments.set(assignment.id, assignment);
    res.json({ success: true, data: submission });
});
router.post('/:id/batch-grade', (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    const { grades } = req.body;
    if (!Array.isArray(grades)) {
        res.status(400).json({ success: false, error: 'grades 必须是数组' });
        return;
    }
    const results = [];
    for (const g of grades) {
        const sub = assignment.submissions.find(s => s.id === g.submissionId);
        if (sub) {
            sub.score = g.score;
            sub.feedback = g.feedback || '';
            sub.status = 'graded';
            results.push(sub);
        }
    }
    db.assignments.set(assignment.id, assignment);
    res.json({ success: true, data: results });
});
router.get('/:id/countdown', (req, res) => {
    const assignment = db.assignments.get(req.params.id);
    if (!assignment) {
        res.status(404).json({ success: false, error: '作业不存在' });
        return;
    }
    const remaining = new Date(assignment.deadline).getTime() - Date.now();
    res.json({
        success: true, data: {
            assignmentId: assignment.id, deadline: assignment.deadline, isExpired: remaining <= 0,
            remainingMs: Math.max(0, remaining),
            remainingDays: Math.max(0, Math.floor(remaining / 86400000)),
            remainingHours: Math.max(0, Math.floor((remaining % 86400000) / 3600000)),
            remainingMinutes: Math.max(0, Math.floor((remaining % 3600000) / 60000)),
        },
    });
});
router.get('/groups/list', (req, res) => {
    const { courseId } = req.query;
    let groups = Array.from(db.groups.values());
    if (courseId)
        groups = groups.filter(g => g.courseId === courseId);
    res.json({ success: true, data: groups });
});
router.post('/groups', (req, res) => {
    const { name, courseId, memberIds, memberNames } = req.body;
    if (!name || !courseId || !memberIds?.length) {
        res.status(400).json({ success: false, error: '缺少必要参数' });
        return;
    }
    const group = { id: uuidv4(), name, courseId, memberIds, memberNames: memberNames || [], createdAt: new Date().toISOString() };
    db.groups.set(group.id, group);
    res.status(201).json({ success: true, data: group });
});
export default router;
