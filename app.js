const express = require("express");
const http = require("http");
const { v4: uuid } = require("uuid");
var htmlspecialchars = require('htmlspecialchars');

const app = express();
const server = http.createServer(app);
const port = process.env.port || 3000;

const io = require("socket.io")(server);

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.render("index");
});

app.get("/uuid", (req, res) => {
	res.send(uuid());
});

const users = new Map(); // userId -> { socketId, username, roomId }

io.on("connection", (socket) => {
	console.log(`user ${socket.id} connected!`);

	socket.on("joinRoom", ({ roomId, userId, username }) => {
		for (const room of socket.rooms)
			if (room !== socket.id) socket.leave(room);

		
		users.set(userId, { 
			socketId: socket.id, 
			username: htmlspecialchars(username), 
			roomId 
		});

		socket.join(roomId);
		io.to(roomId).emit("userConnected", { username });

		console.log(`${username} (${userId}) joined ${roomId}`);
	});

	socket.on("leaveRoom", ({ userId }) => {
		for (const room of socket.rooms) {
			if (room !== socket.id) socket.leave(room);
		}

        let {username, roomId} = users.get(userId);
		
		users.delete(userId);
		io.to(roomId).emit("userDisconnected", { username });

		console.log(`${username} (${userId}) leave room ${roomId}`);
	});

    socket.on("sendMessage", ({ roomId, messageId, subject, content }) => {
        socket.to(roomId).emit("chat", { 
            messageId, 
            subject: htmlspecialchars(subject), 
            content: htmlspecialchars(content), 
            time: new Date().toISOString() 
        });
    });

    socket.on("sendVoice", ({ roomId, messageId, subject, content }) => {
        socket.to(roomId).emit("voice", { 
            messageId, 
            subject: htmlspecialchars(subject), 
            content: content,
            time: new Date().toISOString() 
        });
    });

	socket.on("newLive", ({roomId, messageId, subject}) => {
		socket.to(roomId).emit("liveNew", { 
            messageId, 
            subject: htmlspecialchars(subject), 
            time: new Date().toISOString() 
        });
	});

	socket.on("updateLive", ({roomId, messageId, content}) => {
		socket.to(roomId).emit("liveUpdate", { 
            messageId, 
			content: htmlspecialchars(content),
        });
	});

	socket.on("endLive", ({roomId, messageId}) => {		
		socket.to(roomId).emit("liveEnd", { messageId });
	});

	socket.on("disconnect", () => {
        for (const room of socket.rooms)
            if (room !== socket.id) socket.leave(room);

		for (const [userId, data] of users.entries()) {
			if (data.socketId === socket.id) {
                socket.to(data.roomId).emit("userDisconnected", { username: data.username });
				users.delete(userId);
				break;
			}
		}

        console.log(`User with socked.id ${socket.id} disconnected!`);
	});
});

server.listen(port, () => {
	console.log(`server running at http://localhost:${port}`);
});
