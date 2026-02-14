const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Notification = require('../models/Notification');

/**
 * Helper function: User ID ko safely extract karne ke liye
 * Taaki req.user undefined hone par server crash na ho
 */
const getSafeUserId = (req) => {
    if (!req.user) return null;
    return req.user._id || req.user.id;
};

// 1. Header Data (User, Wallet, Notifications)
exports.getHeaderData = async (req, res) => {
    try {
        const userId = getSafeUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Parallel calls for better performance
        const [user, wallet, notifications] = await Promise.all([
            User.findById(userId).select('name email avatarUrl'),
            Wallet.findOne({ userId }).select('usdBalance tokenBalance'),
            Notification.find({ userId }).sort({ createdAt: -1 }).limit(10)
        ]);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Wallet safety: Agar wallet nahi bana, toh 0 balance return karein crash ki jagah
        const walletData = {
            usdBalance: wallet ? parseFloat(wallet.usdBalance || 0) : 0,
            tokenBalance: wallet ? parseFloat(wallet.tokenBalance || 0) : 0
        };

        const formattedNotifications = notifications.map(notif => ({
            id: notif._id,
            message: notif.message,
            read: notif.read,
            type: notif.type,
            timestamp: new Date(notif.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        }));

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl
            },
            wallet: walletData,
            notifications: formattedNotifications
        });

    } catch (error) {
        console.error('Error fetching header data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Get Wallet Specific Data
exports.getWallet = async (req, res) => {
    try {
        const userId = getSafeUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized access' });
        }

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            // New user ke liye default data
            return res.json({
                success: true,
                wallet: { usdBalance: 0, tokenBalance: 0, lastUpdated: new Date() }
            });
        }

        res.json({
            success: true,
            wallet: {
                usdBalance: parseFloat(wallet.usdBalance || 0),
                tokenBalance: parseFloat(wallet.tokenBalance || 0),
                lastUpdated: wallet.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Mark Single Notification as Read
exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getSafeUserId(req);

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification: { id: notification._id, read: notification.read }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 4. Mark All Notifications as Read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = getSafeUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await Notification.updateMany(
            { userId, read: false },
            { read: true }
        );

        res.json({
            success: true,
            message: `Marked ${result.modifiedCount} notifications as read`
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 5. Delete Single Notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getSafeUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const notification = await Notification.findOneAndDelete({ _id: id, userId });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 6. Clear All Notifications
exports.clearAllNotifications = async (req, res) => {
    try {
        const userId = getSafeUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await Notification.deleteMany({ userId });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} notifications`
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};