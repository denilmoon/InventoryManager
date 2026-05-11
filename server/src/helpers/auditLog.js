const prisma = require('../prisma');

const writeAuditLog = async ({ userId, action, entityType, entityId, details }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
      },
    });
  } catch (err) {
    // Audit log failure should never crash the main operation
    console.error('Audit log write failed:', err);
  }
};

module.exports = writeAuditLog;