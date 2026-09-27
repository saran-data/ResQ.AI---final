/**
 * Email Service - Send notifications to users
 * For MVP: Log emails to console (can be upgraded to real SMTP later)
 */

class EmailService {
  constructor() {
    // For MVP, we'll log emails to console
    // In production, integrate with SendGrid, AWS SES, or NodeMailer + SMTP
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Send email (mock for MVP)
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body
   * @param {string} options.html - HTML body (optional)
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      // For MVP: Log to console
      console.log('\n📧 ==================== EMAIL NOTIFICATION ====================');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`-----------------------------------------------------------`);
      console.log(text);
      console.log('===========================================================\n');

      // In production, would integrate real email service:
      // await transporter.sendMail({ from: 'noreply@resqai.com', to, subject, text, html });

      return { success: true, message: 'Email sent successfully (logged to console in dev mode)' };
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send volunteer assignment notification
   */
  async sendVolunteerAssignment({ volunteer, donation, donor, ngo, route }) {
    const subject = `🚚 New Pickup Assignment - ${donation.foodName}`;
    
    const text = `
Hi ${volunteer.name},

You have been assigned a new food pickup!

📦 DONATION DETAILS:
   Food: ${donation.foodName} (${donation.foodType})
   Quantity: ${donation.quantity} ${donation.unit}
   Expiry: ${this.formatTimeRemaining(donation.estimatedShelfLifeEnd)}
   Urgency: ${donation.urgencyLevel.toUpperCase()}

📍 PICKUP LOCATION:
   From: ${donor.name}
   Address: ${donor.location.address}
   Contact: ${donor.phone}

📍 DELIVERY LOCATION:
   To: ${ngo.name}
   Address: ${ngo.location.address}
   Contact: ${ngo.primaryContact.phone}

🗺️ ROUTE INFORMATION:
   Distance: ${route.distance} km
   Estimated Time: ${route.duration} minutes
   Fuel Savings: ${route.fuelSavings || 'N/A'}

📱 ACTIONS:
   1. View route: http://localhost:3000/volunteer/route/${donation._id}
   2. Accept pickup: http://localhost:3000/volunteer/accept/${donation._id}
   3. Contact donor: tel:${donor.phone}

⚠️ IMPORTANT:
   - Please confirm pickup within 30 minutes
   - Contact donor before arriving
   - Ensure proper food handling and temperature control
   - Report any issues immediately

Thank you for being a ResQ-AI volunteer! 🙏

---
ResQ-AI Food Rescue Platform
http://localhost:3000
    `.trim();

    return await this.sendEmail({
      to: volunteer.email,
      subject,
      text
    });
  }

  /**
   * Send NGO match confirmation
   */
  async sendNGOMatchConfirmation({ ngo, donation, donor }) {
    const subject = `✅ Pickup Requested - ${donation.foodName}`;
    
    const text = `
Hi ${ngo.name},

Your pickup request has been confirmed!

📦 DONATION:
   Food: ${donation.foodName}
   Quantity: ${donation.quantity} ${donation.unit}
   Status: Volunteer being assigned

📍 PICKUP FROM:
   Donor: ${donor.name}
   Address: ${donor.location.address}
   Contact: ${donor.phone}

🚚 NEXT STEPS:
   1. A volunteer will be assigned shortly
   2. You will receive pickup ETA once volunteer confirms
   3. Track status: http://localhost:3000/ngo/dashboard

Thank you for using ResQ-AI!

---
ResQ-AI Food Rescue Platform
http://localhost:3000
    `.trim();

    return await this.sendEmail({
      to: ngo.email,
      subject,
      text
    });
  }

  /**
   * Send donor pickup notification
   */
  async sendDonorPickupNotification({ donor, donation, volunteer, ngo, eta }) {
    const subject = `🚚 Pickup Scheduled - ${donation.foodName}`;
    
    const text = `
Hi ${donor.name},

A volunteer has been assigned to pick up your donation!

📦 YOUR DONATION:
   Food: ${donation.foodName}
   Quantity: ${donation.quantity} ${donation.unit}

🚗 VOLUNTEER DETAILS:
   Name: ${volunteer.name}
   Phone: ${volunteer.phone}
   ETA: ${eta}

🏢 DELIVERY TO:
   NGO: ${ngo.name}
   Address: ${ngo.location.address}

Please ensure the food is ready for pickup at the scheduled time.

Thank you for your contribution to reducing food waste! 🙏

---
ResQ-AI Food Rescue Platform
http://localhost:3000
    `.trim();

    return await this.sendEmail({
      to: donor.email,
      subject,
      text
    });
  }

  /**
   * Format time remaining until expiry
   */
  formatTimeRemaining(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursRemaining = Math.round((expiry - now) / (1000 * 60 * 60));
    
    if (hoursRemaining < 0) return 'EXPIRED';
    if (hoursRemaining < 1) return 'Less than 1 hour';
    if (hoursRemaining === 1) return '1 hour';
    if (hoursRemaining < 24) return `${hoursRemaining} hours`;
    
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  }
}

// Export singleton instance
export default new EmailService();
