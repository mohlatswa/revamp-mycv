/**
 * Google Apps Script — Email relay for Revamp MyCV
 *
 * HOW TO SET UP:
 * 1. Go to https://script.google.com
 * 2. Click "New Project"
 * 3. Delete everything in the editor
 * 4. Copy and paste ALL the code below
 * 5. Click "Deploy" > "New deployment"
 * 6. Set Type = "Web app"
 * 7. Set "Execute as" = "Me"
 * 8. Set "Who has access" = "Anyone"
 * 9. Click "Deploy" and authorize when prompted
 * 10. Copy the Web app URL
 * 11. Paste it in Admin Panel > Settings > Google Apps Script URL
 *
 * That's it! Emails will now be sent TO users from your Gmail.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    MailApp.sendEmail({
      to: data.to_email,
      subject: data.subject,
      body: data.message,
      name: 'Revamp MyCV',
      replyTo: 'revamp.mycv@outlook.com'
    });

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
