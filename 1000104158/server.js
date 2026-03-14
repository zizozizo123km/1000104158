/**
 * Bac DZ AI — Socket.io Signaling Server
 * WebRTC Signaling + Room Management
 * Run: node server.js
 */

const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ─── Room State ──────────────────────────────────────────────────────────────
// rooms[roomId] = { id, name, subject, hostId, hostName, code, maxSeats, seats: {}, viewers: {}, chat: [] }
const rooms = {};

// socketId → { userId, userName, roomId, role: 'participant'|'viewer' }
const socketMeta = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getRoomParticipants(roomId) {
  const room = rooms[roomId];
  if (!room) return [];
  return Object.values(room.seats);
}

function getRoomViewers(roomId) {
  const room = rooms[roomId];
  if (!room) return [];
  return Object.values(room.viewers);
}

function broadcastRoomState(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).emit("room-state", {
    seats: room.seats,
    viewers: room.viewers,
    seatCount: Object.keys(room.seats).length,
    viewerCount: Object.keys(room.viewers).length,
  });
}

// ─── Connection ───────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  // ── Create Room ────────────────────────────────────────────────────────────
  socket.on("create-room", ({ roomId, roomName, subject, hostId, hostName, code, maxSeats }) => {
    rooms[roomId] = {
      id: roomId,
      name: roomName,
      subject,
      hostId,
      hostName,
      code,
      maxSeats: maxSeats || 10,
      seats: {},
      viewers: {},
      chat: [],
      createdAt: Date.now(),
    };
    console.log(`🏠 Room created: ${roomName} [${code}]`);
    // Notify ALL connected sockets about new room
    io.emit("new-room", {
      id: roomId,
      name: roomName,
      subject,
      hostName,
      code,
      createdAt: Date.now(),
    });
    socket.emit("room-created", { roomId });
  });

  // ── Get Room by Code ───────────────────────────────────────────────────────
  socket.on("find-room", ({ code }) => {
    const room = Object.values(rooms).find(r => r.code === code.toUpperCase());
    if (room) {
      socket.emit("room-found", {
        id: room.id,
        name: room.name,
        subject: room.subject,
        hostName: room.hostName,
        code: room.code,
        seatCount: Object.keys(room.seats).length,
        maxSeats: room.maxSeats,
        viewerCount: Object.keys(room.viewers).length,
      });
    } else {
      socket.emit("room-not-found");
    }
  });

  // ── Get All Rooms ──────────────────────────────────────────────────────────
  socket.on("get-rooms", () => {
    const list = Object.values(rooms).map(r => ({
      id: r.id,
      name: r.name,
      subject: r.subject,
      hostName: r.hostName,
      code: r.code,
      seatCount: Object.keys(r.seats).length,
      maxSeats: r.maxSeats,
      viewerCount: Object.keys(r.viewers).length,
      createdAt: r.createdAt,
    }));
    socket.emit("rooms-list", list);
  });

  // ── Join Room as Participant ───────────────────────────────────────────────
  socket.on("join-room", ({ roomId, userId, userName, micOn, camOn }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("join-error", "الغرفة غير موجودة");

    const seatCount = Object.keys(room.seats).length;
    if (seatCount >= room.maxSeats) {
      return socket.emit("join-error", "الغرفة ممتلئة — يمكنك المشاهدة فقط");
    }

    // Add to seats
    room.seats[userId] = { userId, userName, micOn: micOn ?? true, camOn: camOn ?? true, joinedAt: Date.now(), socketId: socket.id };
    socketMeta[socket.id] = { userId, userName, roomId, role: "participant" };

    socket.join(roomId);

    // Notify existing participants to start WebRTC
    socket.to(roomId).emit("user-joined", { userId, userName, socketId: socket.id });

    // Send current room state to new joiner
    socket.emit("join-success", {
      roomId,
      seats: room.seats,
      viewers: room.viewers,
      chat: room.chat.slice(-50),
    });

    broadcastRoomState(roomId);
    console.log(`👤 ${userName} joined room ${room.name}`);
  });

  // ── Join Room as Viewer ────────────────────────────────────────────────────
  socket.on("join-viewer", ({ roomId, userId, userName }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("join-error", "الغرفة غير موجودة");

    room.viewers[userId] = { userId, userName, joinedAt: Date.now(), socketId: socket.id };
    socketMeta[socket.id] = { userId, userName, roomId, role: "viewer" };

    socket.join(roomId);

    socket.emit("join-success", {
      roomId,
      seats: room.seats,
      viewers: room.viewers,
      chat: room.chat.slice(-50),
    });

    broadcastRoomState(roomId);
    console.log(`👁️ ${userName} watching room ${room.name}`);
  });

  // ── WebRTC Signaling ───────────────────────────────────────────────────────
  // Offer
  socket.on("signal-offer", ({ toUserId, fromUserId, fromUserName, sdp, roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    // Find target socket
    const targetSeat = room.seats[toUserId];
    if (targetSeat?.socketId) {
      io.to(targetSeat.socketId).emit("signal-offer", {
        fromUserId,
        fromUserName,
        sdp,
        roomId,
      });
    }
    console.log(`📡 Offer: ${fromUserId} → ${toUserId}`);
  });

  // Answer
  socket.on("signal-answer", ({ toUserId, fromUserId, sdp, roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const targetSeat = room.seats[toUserId];
    if (targetSeat?.socketId) {
      io.to(targetSeat.socketId).emit("signal-answer", {
        fromUserId,
        sdp,
      });
    }
    console.log(`📡 Answer: ${fromUserId} → ${toUserId}`);
  });

  // ICE Candidate
  socket.on("signal-ice", ({ toUserId, fromUserId, candidate, roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const targetSeat = room.seats[toUserId];
    if (targetSeat?.socketId) {
      io.to(targetSeat.socketId).emit("signal-ice", {
        fromUserId,
        candidate,
      });
    }
  });

  // ── Media Toggle ───────────────────────────────────────────────────────────
  socket.on("toggle-media", ({ roomId, userId, micOn, camOn }) => {
    const room = rooms[roomId];
    if (!room || !room.seats[userId]) return;
    room.seats[userId].micOn = micOn;
    room.seats[userId].camOn = camOn;
    socket.to(roomId).emit("media-updated", { userId, micOn, camOn });
    broadcastRoomState(roomId);
  });

  // ── Chat Message ───────────────────────────────────────────────────────────
  socket.on("chat-message", ({ roomId, userId, userName, text, isViewer }) => {
    const room = rooms[roomId];
    if (!room) return;
    const msg = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      userName,
      text,
      isViewer: isViewer || false,
      timestamp: Date.now(),
    };
    room.chat.push(msg);
    // Keep last 200 messages
    if (room.chat.length > 200) room.chat = room.chat.slice(-200);
    // Broadcast to ALL in room including sender
    io.to(roomId).emit("chat-message", msg);
  });

  // ── Leave Room ─────────────────────────────────────────────────────────────
  socket.on("leave-room", ({ roomId, userId }) => {
    handleLeave(socket, roomId, userId);
  });

  // ── Delete Room ────────────────────────────────────────────────────────────
  socket.on("delete-room", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.hostId !== userId) return;
    io.to(roomId).emit("room-deleted", { roomId });
    delete rooms[roomId];
    console.log(`🗑️ Room deleted: ${roomId}`);
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const meta = socketMeta[socket.id];
    if (meta) {
      handleLeave(socket, meta.roomId, meta.userId);
      delete socketMeta[socket.id];
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });

  // ─── Internal: handle leave ─────────────────────────────────────────────
  function handleLeave(sock, roomId, userId) {
    const room = rooms[roomId];
    if (!room) return;

    const wasParticipant = !!room.seats[userId];
    const wasViewer = !!room.viewers[userId];

    delete room.seats[userId];
    delete room.viewers[userId];

    sock.leave(roomId);
    sock.to(roomId).emit("user-left", { userId });

    broadcastRoomState(roomId);

    const totalLeft = Object.keys(room.seats).length + Object.keys(room.viewers).length;

    // If host left and room is empty → delete room
    if (room.hostId === userId && totalLeft === 0) {
      io.to(roomId).emit("room-deleted", { roomId });
      delete rooms[roomId];
      console.log(`🗑️ Room auto-deleted (host left): ${roomId}`);
    }

    if (wasParticipant) console.log(`👋 ${userId} left room ${roomId}`);
    if (wasViewer) console.log(`👁️ Viewer ${userId} left room ${roomId}`);
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io Signaling Server running on port ${PORT}`);
  console.log(`📡 CORS: * (all origins allowed)`);
});
