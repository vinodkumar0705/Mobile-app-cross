import * as dotenv from "dotenv";
dotenv.config(); // ← loads .env before anything else

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log("SID:", accountSid); // verify it's loading
console.log("Token:", authToken ? "loaded" : "missing");

const client = twilio(accountSid, authToken);

client.messages.create({
    from: "whatsapp:+14155238886",
    to: "whatsapp:+917036618647", // ← your number that joined sandbox
    body: "Twilio connected successfully from HMS!",
}).then(msg => console.log("Sent:", msg.sid))
    .catch(err => console.error("Failed:", err.message));