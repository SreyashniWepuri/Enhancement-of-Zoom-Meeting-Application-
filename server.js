const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const url = require("url");
const peerServer = ExpressPeerServer(server, {
    debug: true,
});
const path = require("path");
const fs = require('fs');

app.set("view engine", "ejs");
app.use("/public", express.static(path.join(__dirname, "static")));
app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get("/join", (req, res) => {
    
    if (req.query.hasOwnProperty("room")){
        //console.log(req.query)
        
    res.redirect(
        url.format({
            pathname: `/join/${req.query.meeting_id}`,
            query: req.query,
        })
    );
}
else{
    const { name, startTime, endTime } = req.query;
    const roomId = uuidv4();

    try {
        let meetingData = {};
        const data = fs.readFileSync("meetings.json", "utf-8");
        meetingData = JSON.parse(data);
        meetingData[roomId] = { startTime, endTime };
        fs.writeFileSync("meetings.json", JSON.stringify(meetingData));
    } catch (error) {
        console.error("Error writing to meetings.json file:", error);
        res.status(500).send("Internal Server Error");
        return;
    }
    res.redirect(
        url.format({
            pathname: `/join/${roomId}`,
            query: req.query,
        })
    );
}
    
});


app.get("/joinold", (req, res) => {
    console.log(req.query);
    res.redirect(
        url.format({
            pathname: req.query.meeting_id,
            query: req.query,
        })
    );
});

app.get("/join/:rooms", (req, res) => {
    console.log(req.query)
    if (req.query.hasOwnProperty("room")){
        
    res.render("room", { roomid: req.params.rooms, Myname: req.query.name, subroom: "yes",startTime:req.query.startTime,endTime:req.query.endTime});
    }
    else{
        const roomId = req.params.rooms;
        let meetingData = {};
    
        try {
            const data = fs.readFileSync("meetings.json", "utf-8");
            meetingData = JSON.parse(data)
            if (!req.params.startTime ||  !req.params.endTime){
                req.params.startTime = meetingData[roomId].startTime;
                req.params.endTime = meetingData[roomId].endTime;
            }
            const meetingDetails = meetingData[roomId] || {};
            const { startTime, endTime } = meetingDetails;
            res.render("room", { roomid: req.params.rooms, Myname: req.query.name, subroom:"No", startTime: req.query.startTime || req.params.startTime, endTime: req.query.endTime || req.params.endTime });
        }catch (e) {
            console.log(e)
        }
    }
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, id, myname) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit("user-connected", id, myname);

        socket.on("messagesend", (message) => {
            //console.log(message);
            io.to(roomId).emit("createMessage", message);
        });

        socket.on("tellName", (myname) => {
           // console.log(myname);
            socket.to(roomId).broadcast.emit("AddName", myname);
        });

        socket.on("disconnect", () => {
            socket.to(roomId).broadcast.emit("user-disconnected", id);
        });
    });
});

server.listen(process.env.PORT || 3030);