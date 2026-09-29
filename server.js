const { app } = require("./app");

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Campus Meal Queue Manager is running on port ${port}`));
