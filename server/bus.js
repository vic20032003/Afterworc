'use strict';
/* In-process event bus: business logic publishes, the WebSocket layer delivers. Keeps domain.js free of transport code. */
const { EventEmitter } = require('events');
const bus = new EventEmitter();
bus.setMaxListeners(50);
/** Tell a user's open apps that something changed (they refetch state). */
bus.sync = userId => { if (userId) bus.emit('user', userId, { t: 'sync' }); };
bus.toUser = (userId, msg) => { if (userId) bus.emit('user', userId, msg); };
bus.toStaff = msg => bus.emit('staff', msg);
module.exports = bus;
