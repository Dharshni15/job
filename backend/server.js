import app from "./app.js";

const PORT = process.env.PORT || 4001;
const server = app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});


server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    process.exit(1);
  } else {
    throw err;
  }
});
