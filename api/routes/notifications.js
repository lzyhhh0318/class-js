import { Router } from 'express';
import { db } from '../db.js';
const router = Router();
router.get('/notifications', (_req, res) => {
    const events = db.notificationQueue.slice(-50);
    res.json({ success: true, data: events });
});
router.post('/notifications/clear', (_req, res) => {
    db.notificationQueue = [];
    res.json({ success: true, message: '通知队列已清空' });
});
router.post('/notify', (req, res) => {
    const { type, courseId, resourceId, message } = req.body;
    if (!type || !message) {
        res.status(400).json({ success: false, error: '缺少必要参数' });
        return;
    }
    db.notificationQueue.push({
        type,
        courseId: courseId || '',
        resourceId: resourceId || '',
        message,
        timestamp: new Date().toISOString(),
    });
    res.json({ success: true, message: '通知已推送' });
});
export default router;
