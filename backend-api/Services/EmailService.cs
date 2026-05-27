using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using AutoServe.API.DTOs;

namespace AutoServe.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, AppDbContext context, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _context = context;
            _logger = logger;
        }

        private async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
        {
            try
            {
                string smtpServer = _configuration["Smtp:Server"] ?? "localhost";
                int smtpPort = int.Parse(_configuration["Smtp:Port"] ?? "25");
                string senderEmail = _configuration["Smtp:SenderEmail"] ?? "no-reply@autoserve.com";
                string senderName = _configuration["Smtp:SenderName"] ?? "AutoServe Portal";
                string username = _configuration["Smtp:Username"] ?? "";
                string password = _configuration["Smtp:Password"] ?? "";
                bool enableSsl = bool.Parse(_configuration["Smtp:EnableSsl"] ?? "false");

                using (var mail = new MailMessage())
                {
                    mail.From = new MailAddress(senderEmail, senderName);
                    mail.To.Add(new MailAddress(toEmail, toName));
                    mail.Subject = subject;
                    mail.Body = htmlBody;
                    mail.IsBodyHtml = true;

                    using (var smtp = new SmtpClient(smtpServer, smtpPort))
                    {
                        smtp.EnableSsl = enableSsl;
                        smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
                        smtp.UseDefaultCredentials = string.IsNullOrEmpty(username);

                        if (!string.IsNullOrEmpty(username))
                        {
                            smtp.Credentials = new NetworkCredential(username, password);
                        }

                        await smtp.SendMailAsync(mail);
                        _logger.LogInformation($"[SMTP] Email successfully sent to {toEmail}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"[SMTP ERROR] Could not send email to {toEmail}: {ex.Message}");
            }
        }

        public async Task SendInvoiceEmailAsync(string toEmail, string toName, string invoiceNumber, decimal subTotal, decimal discountAmount, decimal totalAmount, List<OrderItemSummaryDto> items)
        {
            try
            {
                var itemRows = new StringBuilder();
                foreach (var item in items)
                {
                    string prodName = item.ProductName;
                    if (string.IsNullOrEmpty(prodName) && item.ProductId > 0)
                    {
                        var product = await _context.Products.FindAsync(item.ProductId);
                        prodName = product?.Name ?? "Vehicle Part";
                    }

                    itemRows.Append($@"
                        <tr>
                            <td style=""padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; color: #1e293b;"">{prodName}</td>
                            <td style=""padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 0.95rem; color: #1e293b;"">{item.Quantity}</td>
                            <td style=""padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 0.95rem; color: #1e293b;"">Rs. {item.UnitPrice:F2}</td>
                            <td style=""padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 0.95rem; font-weight: bold; color: #0b3c5d;"">Rs. {(item.Quantity * item.UnitPrice):F2}</td>
                        </tr>
                    ");
                }

                string htmlBody = $@"
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset=""UTF-8"">
                        <title>AutoServe Sales Invoice</title>
                    </head>
                    <body style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;"">
                        <div style=""max-width: 650px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);"">
                            <div style=""background-color: #0b3c5d; padding: 30px; text-align: center;"">
                                <h1 style=""color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;"">AUTOSERVE</h1>
                                <p style=""color: #38bdf8; margin: 5px 0 0 0; font-size: 14px; font-weight: 600;"">Premium Vehicle Parts & Customer Portal</p>
                            </div>
                            <div style=""padding: 30px;"">
                                <h2 style=""color: #0f172a; margin-top: 0; font-size: 20px;"">Sales Invoice Reciept</h2>
                                <p style=""color: #475569; line-height: 1.6;"">Dear <strong>{toName}</strong>,</p>
                                <p style=""color: #475569; line-height: 1.6;"">Thank you for purchasing vehicle parts with AutoServe. Your transaction has been completed successfully.</p>
                                <table style=""width: 100%; margin: 25px 0; font-size: 14px; color: #64748b;"">
                                    <tr>
                                        <td><strong>Invoice Number:</strong> <span style=""color: #0f172a; font-weight: bold;"">{invoiceNumber}</span></td>
                                        <td style=""text-align: right;""><strong>Billing Date:</strong> <span style=""color: #0f172a; font-weight: bold;"">{DateTime.Now.ToShortDateString()}</span></td>
                                    </tr>
                                </table>
                                <table style=""width: 100%; border-collapse: collapse; margin-bottom: 25px;"">
                                    <thead>
                                        <tr style=""background-color: #f1f5f9; text-align: left;"">
                                            <th style=""padding: 12px; border-bottom: 2px solid #cbd5e1; font-size: 0.85rem; color: #475569; font-weight: 700;"">Part Description</th>
                                            <th style=""padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: center; font-size: 0.85rem; color: #475569; font-weight: 700;"">Qty</th>
                                            <th style=""padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: right; font-size: 0.85rem; color: #475569; font-weight: 700;"">Unit Price</th>
                                            <th style=""padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: right; font-size: 0.85rem; color: #475569; font-weight: 700;"">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>{itemRows}</tbody>
                                </table>
                                <div style=""width: 280px; margin-left: auto; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;"">
                                    <table style=""width: 100%; font-size: 14px; color: #475569;"">
                                        <tr><td style=""padding: 4px 0;"">Subtotal:</td><td style=""padding: 4px 0; text-align: right; font-weight: 600;"">Rs. {subTotal:F2}</td></tr>
                                        <tr><td style=""padding: 4px 0;"">Discount applied:</td><td style=""padding: 4px 0; text-align: right; color: #16a34a; font-weight: 600;"">- Rs. {discountAmount:F2}</td></tr>
                                        <tr style=""font-size: 16px; font-weight: bold; color: #0f172a;"">
                                            <td style=""padding: 8px 0 0 0; border-top: 1px solid #cbd5e1;"">Total Paid:</td>
                                            <td style=""padding: 8px 0 0 0; border-top: 1px solid #cbd5e1; text-align: right; color: #0b3c5d;"">Rs. {totalAmount:F2}</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>";

                await SendAsync(toEmail, toName, $"AutoServe Purchase Invoice - {invoiceNumber}", htmlBody);
            }
            catch (Exception ex)
            {
                _logger.LogError($"[SMTP ERROR] Could not format or send invoice email: {ex.Message}");
            }
        }

        public async Task SendInvoiceAsync(string toEmail, string toName, int orderId, decimal totalAmount, decimal discountAmount, string status, List<InvoiceItemDto> items)
        {
            var summaryItems = items.Select(i => new OrderItemSummaryDto
            {
                ProductName = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList();

            decimal subTotal = items.Sum(i => i.Subtotal);
            string invoiceNo = $"INV-{orderId:D5}";

            await SendInvoiceEmailAsync(toEmail, toName, invoiceNo, subTotal, discountAmount, totalAmount, summaryItems);
        }

        public async Task SendOverdueCreditReminderAsync(string toEmail, string customerName, decimal amountOwed, DateTime dueDate)
        {
            var subject = "AutoServe Payment Reminder";
            var body = $@"<h2>Payment Reminder</h2><p>Dear {customerName},</p><p>You have an outstanding balance of <strong>Rs. {amountOwed:F2}</strong>.</p><p>Original Due Date: {dueDate:dd MMM yyyy}</p><p>Please visit our service center to settle your payment.</p>";
            await SendAsync(toEmail, customerName, subject, body);
        }

        public async Task SendLowStockAlertAsync(string adminEmail, List<LowStockItemDto> lowStockItems)
        {
            var subject = "AutoServe Low Stock Alert";
            var rows = string.Join("", lowStockItems.Select(i => $"<tr><td>{i.ProductId}</td><td>{i.ProductName}</td><td>{i.StockQty}</td></tr>"));
            var body = $@"<h2>Low Stock Alert</h2><table border='1'><tr><th>ID</th><th>Part</th><th>Stock</th></tr>{rows}</table>";
            await SendAsync(adminEmail, "Admin", subject, body);
        }
    }
}
