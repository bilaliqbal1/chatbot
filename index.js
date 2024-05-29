const express = require("express");
const bodyParser = require("body-parser");
const dialogflow = require("@google-cloud/dialogflow");
const uuid = require("uuid");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// Path to your Dialogflow key file
const keyFilePath = "./chatbot.json";
const projectId = "chatbot-dgvb"; // replace with your Dialogflow project ID

// Create a new session client
const sessionClient = new dialogflow.SessionsClient({
  keyFilename: keyFilePath,
});

app.post("/ask", async (req, res) => {
  const question = req.body.question;
  const sessionId = uuid.v4();
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: question,
        languageCode: "en-US", // replace with your language code
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    // Check if the intent has an orderId parameter
    const parameters = result.parameters.fields;
    if (parameters.orderId) {
      const orderId = parameters.orderId.numberValue;
      // Call the external API to get the shipment date
      const apiResponse = await axios.post(
        "https://orderstatusapi-dot-organization-project-311520.uc.r.appspot.com/api/getOrderStatus",
        { orderId }
      );
      const shipmentDate = apiResponse.data.shipmentDate;
      const formattedDate = new Date(shipmentDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      res.json({
        response: `Your order ${orderId} will be shipped on ${formattedDate}`,
      });
    } else {
      res.json({
        response: result.fulfillmentText,
      });
    }
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).send("Error processing your request");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
