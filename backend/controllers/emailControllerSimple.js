import emailService from "../services/emailService.js";

// Test email configuration
export const testEmailConfiguration = async (req, res, next) => {
  try {
    console.log("🧪 Testing email configuration...");
    
    const result = await emailService.testEmailConfiguration();
    
    res.status(200).json({
      success: true,
      message: "Email test completed successfully",
      result
    });
  } catch (error) {
    console.error("Email test failed:", error);
    res.status(500).json({
      success: false,
      message: `Email test failed: ${error.message}`,
      error: error.message
    });
  }
};

// Test sending a welcome email
export const testWelcomeEmail = async (req, res, next) => {
  try {
    console.log("🧪 Testing welcome email...");
    
    const result = await emailService.sendTransactionalEmail('welcome', 'test@example.com', {
      name: 'Test User',
      dashboardUrl: 'http://localhost:5173/dashboard',
      profileCompleteness: 25,
      supportUrl: 'http://localhost:5173/support'
    });
    
    res.status(200).json({
      success: true,
      message: "Welcome email test completed successfully",
      result
    });
  } catch (error) {
    console.error("Welcome email test failed:", error);
    res.status(500).json({
      success: false,
      message: `Welcome email test failed: ${error.message}`,
      error: error.message
    });
  }
};