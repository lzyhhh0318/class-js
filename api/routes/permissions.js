import { Router } from 'express';
import { db } from '../db.js';
const router = Router();
export function requireRole(...roles) {
    return (req, res, next) => {
        const userId = req.headers['x-user-id'] || req.query.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: '未登录，请先登录' });
            return;
        }
        const user = db.users.get(userId);
        if (!user) {
            res.status(401).json({ success: false, error: '用户不存在' });
            return;
        }
        if (!roles.includes(user.role)) {
            res.status(403).json({ success: false, error: '权限不足' });
            return;
        }
        ;
        req.user = user;
        next();
    };
}
export function requireCourseAccess() {
    return (req, res, next) => {
        const userId = req.headers['x-user-id'] || req.query.userId;
        const courseId = req.params.courseId || req.body.courseId;
        if (!userId) {
            res.status(401).json({ success: false, error: '未登录' });
            return;
        }
        const user = db.users.get(userId);
        if (!user) {
            res.status(401).json({ success: false, error: '用户不存在' });
            return;
        }
        if (user.role === 'admin') {
            ;
            req.user = user;
            next();
            return;
        }
        if (courseId && !user.courseIds.includes(courseId)) {
            res.status(403).json({ success: false, error: '无权访问该课程' });
            return;
        }
        ;
        req.user = user;
        next();
    };
}
router.get('/users', (_req, res) => {
    const users = Array.from(db.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        courseIds: u.courseIds,
    }));
    res.json({ success: true, data: users });
});
router.post('/login', (req, res) => {
    const { userId } = req.body;
    const user = db.users.get(userId);
    if (!user) {
        res.status(404).json({ success: false, error: '用户不存在' });
        return;
    }
    res.json({
        success: true,
        data: {
            id: user.id,
            name: user.name,
            role: user.role,
            courseIds: user.courseIds,
        },
    });
});
router.get('/users/:userId/permissions', (req, res) => {
    const user = db.users.get(req.params.userId);
    if (!user) {
        res.status(404).json({ success: false, error: '用户不存在' });
        return;
    }
    const permissions = {
        canUploadMaterial: user.role === 'teacher' || user.role === 'admin',
        canDeleteMaterial: user.role === 'teacher' || user.role === 'admin',
        canDownloadMaterial: true,
        canViewMaterial: true,
        canPublishAssignment: user.role === 'teacher' || user.role === 'admin',
        canSubmitAssignment: user.role === 'student',
        canGradeAssignment: user.role === 'teacher' || user.role === 'admin',
        canManageCategories: user.role === 'admin',
        canViewAllCourses: user.role === 'admin',
    };
    res.json({ success: true, data: { user: { id: user.id, name: user.name, role: user.role }, permissions } });
});
export default router;
