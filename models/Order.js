const db = require('../config/db');

class Order {
  static async create({ userId, symbol, targetPrice, side, scheduleMinutes }) {
    const query = `INSERT INTO orders (user_id, symbol, target_price, side, schedule_minutes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    return db.run(query, [userId, symbol, targetPrice, side, scheduleMinutes, 'pending', new Date()]);
  }

  static async getPending() {
    const query = `SELECT * FROM orders WHERE status = 'pending'`;
    return db.all(query);
  }

  static async updateStatus(orderId, status) {
    const query = `UPDATE orders SET status = ?, executed_at = ? WHERE id = ?`;
    return db.run(query, [status, new Date(), orderId]);
  }
}

module.exports = Order;
