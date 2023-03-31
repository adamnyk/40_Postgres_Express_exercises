/** Server startup for BizTime. */
const app = require("./app");


app.listen(3000, function () {
  console.log("Listening on 3000. http://localhost:3000/");
});