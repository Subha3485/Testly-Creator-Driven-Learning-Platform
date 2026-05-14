
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/testseries";
const PORT = Number(process.env.PORT || 4000);
const FRONTEND_DIST_DIR = path.resolve(__dirname, "..", "frontend", "dist");
const BACKEND_DATA_DIR = process.env.BACKEND_DATA_DIR
	? path.resolve(process.env.BACKEND_DATA_DIR)
	: path.resolve(__dirname, "data");

const app = express();
app.use(cors());
app.use(express.json());

app.use(
	"/question-images",
	express.static(path.resolve(BACKEND_DATA_DIR, "images"))
);

app.get("/health", (_req, res) => {
	res.json({ status: "ok", service: "test-series-backend" });
});

app.use("/api/test", require("./routes/test.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/ai", require("./routes/ai.routes"));

function serveFrontendBuild() {
	if (!fs.existsSync(FRONTEND_DIST_DIR)) {
		return;
	}

	app.use(express.static(FRONTEND_DIST_DIR));
	app.get("*", (req, res, next) => {
		if (req.path.startsWith("/api") || req.path === "/health") {
			return next();
		}

		res.sendFile(path.join(FRONTEND_DIST_DIR, "index.html"));
	});
}

async function startServer() {
	if (process.env.NODE_ENV === "production") {
		serveFrontendBuild();
	}

	app.listen(PORT, () => {
		// eslint-disable-next-line no-console
		console.log(`Backend running on http://localhost:${PORT}`);
	});

	try {
		await mongoose.connect(MONGO_URI);
		// eslint-disable-next-line no-console
		console.log("MongoDB connected");
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("MongoDB unavailable. File-based practice endpoints still work:", error.message);
	}
}

if (require.main === module) {
	startServer();
}

module.exports = {
	app,
	startServer,
	serveFrontendBuild,
};
