using AutoServe.API.DTOs;

namespace AutoServe.API.Services;

public interface IEmailService
{
    Task SendInvoiceAsync(string toEmail, string customerName, int orderId,
        decimal totalAmount, decimal discountAmount, string status,
        List<InvoiceItemDto> items);

    Task SendInvoiceEmailAsync(string toEmail, string toName, string invoiceNumber, 
        decimal subTotal, decimal discountAmount, decimal totalAmount, 
        List<OrderItemSummaryDto> items);

    Task SendOverdueCreditReminderAsync(string toEmail, string customerName,
        decimal amountOwed, DateTime dueDate);

    Task SendLowStockAlertAsync(string adminEmail, List<LowStockItemDto> lowStockItems);
}

public record InvoiceItemDto(
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal
);

public record LowStockItemDto(
    int ProductId,
    string ProductName,
    string SKU,
    int StockQty
);