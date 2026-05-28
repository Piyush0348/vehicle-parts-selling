// Services/EmailService.cs
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace AutoServe.API.Services;

public class EmailService : IEmailService
{
    private readonly EmailOptions _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IOptions<EmailOptions> options,
        ILogger<EmailService> logger)
    {
        _settings = options.Value;
        _logger   = logger;
    }

    // ── Core SMTP sender ───────────────────────────────────────────────
    private async Task SendAsync(
        string toEmail,
        string subject,
        string htmlBody)
    {
        try
        {
            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                Credentials = new NetworkCredential(
                    _settings.Username,
                    _settings.Password),
                EnableSsl = true
            };

            using var message = new MailMessage
            {
                From       = new MailAddress(
                                 _settings.FromAddress,
                                 _settings.FromName),
                Subject    = subject,
                Body       = htmlBody,
                IsBodyHtml = true
            };

            message.To.Add(toEmail);
            await client.SendMailAsync(message);

            _logger.LogInformation(
                "Email sent to {Email} — {Subject}",
                toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send email to {Email} — {Subject}",
                toEmail, subject);
            throw;
        }
    }

    // ── Send Invoice (used by NotificationsController) ─────────────────
    public async Task SendInvoiceAsync(
        string               toEmail,
        string               customerName,
        int                  orderId,
        decimal              totalAmount,
        decimal              discountAmount,
        string               orderStatus,
        List<InvoiceItemDto> items)
    {
        var itemRows = string.Join("", items.Select(item => $@"
            <tr>
                <td style='padding:8px;border:1px solid #ddd'>
                    {item.ProductName}
                </td>
                <td style='padding:8px;border:1px solid #ddd;
                           text-align:center'>
                    {item.Quantity}
                </td>
                <td style='padding:8px;border:1px solid #ddd;
                           text-align:right'>
                    Rs. {item.UnitPrice:F2}
                </td>
                <td style='padding:8px;border:1px solid #ddd;
                           text-align:right'>
                    Rs. {item.Subtotal:F2}
                </td>
            </tr>"));

        var netTotal = totalAmount - discountAmount;

        var html = $@"
        <div style='font-family:Arial,sans-serif;
                    max-width:650px;margin:0 auto'>

            <div style='background:#1a73e8;color:white;
                        padding:24px;border-radius:8px 8px 0 0'>
                <h2 style='margin:0'>
                    AutoServe — Invoice #{orderId}
                </h2>
            </div>

            <div style='padding:24px;
                        border:1px solid #ddd;
                        border-top:none'>

                <p>Dear <strong>{customerName}</strong>,</p>
                <p>Thank you for your purchase.
                   Here is your invoice summary.</p>

                <table style='width:100%;
                              border-collapse:collapse;
                              margin:16px 0'>
                    <thead>
                        <tr style='background:#f5f5f5'>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:left'>
                                Product
                            </th>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:center'>
                                Qty
                            </th>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:right'>
                                Unit Price
                            </th>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:right'>
                                Subtotal
                            </th>
                        </tr>
                    </thead>
                    <tbody>{itemRows}</tbody>
                </table>

                <table style='width:100%;margin-top:8px'>
                    <tr>
                        <td style='text-align:right;padding:4px'>
                            Subtotal:
                        </td>
                        <td style='text-align:right;
                                   padding:4px;width:140px'>
                            Rs. {totalAmount:F2}
                        </td>
                    </tr>
                    <tr>
                        <td style='text-align:right;
                                   padding:4px;color:green'>
                            Discount:
                        </td>
                        <td style='text-align:right;
                                   padding:4px;color:green'>
                            - Rs. {discountAmount:F2}
                        </td>
                    </tr>
                    <tr style='font-weight:bold;font-size:1.1em'>
                        <td style='text-align:right;padding:4px'>
                            Total Payable:
                        </td>
                        <td style='text-align:right;padding:4px'>
                            Rs. {netTotal:F2}
                        </td>
                    </tr>
                </table>

                <p style='margin-top:16px'>
                    Status: <strong>{orderStatus}</strong>
                </p>
                <hr>
                <p style='color:#888;font-size:0.85em'>
                    AutoServe Auto Parts — Nepal<br>
                    Contact: 9800000000
                </p>
            </div>
        </div>";

        await SendAsync(
            toEmail,
            $"AutoServe Invoice — Order #{orderId}",
            html);
    }

    // ── SendInvoiceEmailAsync (alias used by OrderService) ─────────────
    public async Task SendInvoiceEmailAsync(
        string               toEmail,
        string               customerName,
        int                  orderId,
        decimal              totalAmount,
        decimal              discountAmount,
        string               orderStatus,
        List<InvoiceItemDto> items)
    {
        await SendInvoiceAsync(
            toEmail,
            customerName,
            orderId,
            totalAmount,
            discountAmount,
            orderStatus,
            items);
    }

    // ── Send Low Stock Alert ───────────────────────────────────────────
    public async Task SendLowStockAlertAsync(
        string                adminEmail,
        List<LowStockItemDto> items)
    {
        var itemRows = string.Join("", items.Select(item =>
        {
            var color = item.StockQty == 0 ? "red" : "orange";
            return $@"
            <tr>
                <td style='padding:8px;border:1px solid #ddd'>
                    {item.ProductName}
                </td>
                <td style='padding:8px;border:1px solid #ddd'>
                    {item.SKU}
                </td>
                <td style='padding:8px;
                           border:1px solid #ddd;
                           text-align:center;
                           color:{color};
                           font-weight:bold'>
                    {item.StockQty}
                </td>
            </tr>";
        }));

        var html = $@"
        <div style='font-family:Arial,sans-serif;
                    max-width:650px;margin:0 auto'>

            <div style='background:#e53935;color:white;
                        padding:24px;border-radius:8px 8px 0 0'>
                <h2 style='margin:0'>
                    ⚠ Low Stock Alert — AutoServe
                </h2>
            </div>

            <div style='padding:24px;
                        border:1px solid #ddd;
                        border-top:none'>

                <p>The following <strong>{items.Count}</strong>
                   item(s) are running low on stock
                   (threshold: 10 units):</p>

                <table style='width:100%;
                              border-collapse:collapse;
                              margin:16px 0'>
                    <thead>
                        <tr style='background:#f5f5f5'>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:left'>
                                Product
                            </th>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:left'>
                                SKU
                            </th>
                            <th style='padding:8px;
                                       border:1px solid #ddd;
                                       text-align:center'>
                                Stock Qty
                            </th>
                        </tr>
                    </thead>
                    <tbody>{itemRows}</tbody>
                </table>

                <p>Please restock as soon as possible.</p>
                <hr>
                <p style='color:#888;font-size:0.85em'>
                    AutoServe Auto Parts — Nepal
                </p>
            </div>
        </div>";

        await SendAsync(
            adminEmail,
            "⚠ Low Stock Alert — AutoServe",
            html);
    }

    // ── Send Overdue Credit Reminder ───────────────────────────────────
    public async Task SendOverdueCreditReminderAsync(
        string   toEmail,
        string   customerName,
        decimal  totalOwed,
        DateTime earliestDueDate)
    {
        var daysOverdue =
            (int)(DateTime.UtcNow - earliestDueDate).TotalDays;

        var html = $@"
        <div style='font-family:Arial,sans-serif;
                    max-width:650px;margin:0 auto'>

            <div style='background:#f57c00;color:white;
                        padding:24px;border-radius:8px 8px 0 0'>
                <h2 style='margin:0'>
                    Payment Reminder — AutoServe
                </h2>
            </div>

            <div style='padding:24px;
                        border:1px solid #ddd;
                        border-top:none'>

                <p>Dear <strong>{customerName}</strong>,</p>
                <p>You have an outstanding balance
                   with AutoServe Auto Parts.</p>

                <table style='width:100%;
                              border-collapse:collapse;
                              margin:16px 0'>
                    <tr style='background:#fff8e1'>
                        <td style='padding:12px;
                                   border:1px solid #ddd;
                                   font-weight:bold'>
                            Amount Owed
                        </td>
                        <td style='padding:12px;
                                   border:1px solid #ddd;
                                   font-size:1.2em;
                                   color:#e53935;
                                   font-weight:bold'>
                            Rs. {totalOwed:F2}
                        </td>
                    </tr>
                    <tr>
                        <td style='padding:12px;
                                   border:1px solid #ddd;
                                   font-weight:bold'>
                            Overdue Since
                        </td>
                        <td style='padding:12px;
                                   border:1px solid #ddd'>
                            {earliestDueDate:dd MMM yyyy}
                            ({daysOverdue} days ago)
                        </td>
                    </tr>
                </table>

                <p>Please visit our store or contact us
                   to settle your balance.</p>
                <p><strong>Contact:</strong> 9800000000</p>
                <hr>
                <p style='color:#888;font-size:0.85em'>
                    AutoServe Auto Parts — Nepal
                </p>
            </div>
        </div>";

        await SendAsync(
            toEmail,
            "Payment Reminder — AutoServe Auto Parts",
            html);
    }
}