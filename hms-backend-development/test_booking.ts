async function testBooking() {
  try {
    const payload = {
      patientInfo: {
        fName: "TestUser",
        lName: "Sharma",
        phoneNumber: "+91 9876543210",
        age: "35",
        gender: "MALE",
        bloodGroup: "O+",
      },
      doctorId: "DOC000001",
      appointmentDate: new Date().toISOString().split("T")[0],
      reason: "Routine Examination",
      paidAmount: 75,
    };

    console.log("Sending booking payload to http://localhost:8080/api/v1/patient/bookAppointment...");
    const start = Date.now();
    const res = await fetch("http://localhost:8080/api/v1/patient/bookAppointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - start;
    console.log(`Response status: ${res.status} (took ${elapsed}ms)`);
    const json = await res.json();
    console.log("Response body:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

testBooking();
