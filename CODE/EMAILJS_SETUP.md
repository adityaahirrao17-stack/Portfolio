# EmailJS Setup Instructions

Follow these steps to configure the email integration for your contact form:

## Step 1: Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account (100 emails/month free tier)
3. Verify your email address

## Step 2: Add Email Service
1. In your EmailJS dashboard, click on **"Email Services"**
2. Click **"Add New Service"**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the instructions to connect your email account
5. Copy the **Service ID** (you'll need this later)

## Step 3: Create Email Template
1. In your dashboard, click on **"Email Templates"**
2. Click **"Create New Template"**
3. Use this template structure:

**Subject:**
```
New Contact Form Message: {{subject}}
```

**Content:**
```
You have received a new message from your portfolio contact form.

From: {{from_name}}
Email: {{from_email}}
Phone: {{phone}}
Subject: {{subject}}

Message:
{{message}}

---
This message was sent from your portfolio website contact form.
```

4. Save the template and copy the **Template ID**

## Step 4: Get Your Public Key
1. Go to **"Account"** > **"General"**
2. Find your **Public Key** (it looks like: `Kj8xL9mN2pQ3rS4tU`)
3. Copy this key

## Step 5: Update Your Code
Open `script.js` and replace the placeholders:

1. Replace `YOUR_PUBLIC_KEY` on line 6 with your actual Public Key
2. Replace `YOUR_SERVICE_ID` on line 83 with your Service ID
3. Replace `YOUR_TEMPLATE_ID` on line 83 with your Template ID

**Example:**
```javascript
// Line 6
emailjs.init("Kj8xL9mN2pQ3rS4tU");

// Line 83
emailjs.sendForm('service_abc123', 'template_xyz789', this)
```

## Step 6: Update Email Address (Optional)
If you want to use a different email for the contact form:
1. In `index.html`, find the email link in the footer
2. Update `adityaahirrao@example.com` to your actual email address

## Step 7: Test
1. Save all files
2. Push changes to GitHub
3. Test the contact form by submitting a test message
4. Check your email inbox for the message

## Troubleshooting
- **No email received?** Check your EmailJS dashboard for failed sends
- **"FAILED" error?** Verify your Service ID and Template ID are correct
- **Still not working?** Check browser console (F12) for error messages

## Alternative: Using Formspree (Simpler Option)
If you prefer a simpler solution without JavaScript configuration:

1. Go to [Formspree.io](https://formspree.io/)
2. Create a free account
3. Get your form endpoint
4. Update the form in `index.html`:
   ```html
   <form class="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

Note: With Formspree, you don't need the EmailJS script or the JavaScript handler.
