// Services/IEmailService.cs
namespace AutoServe.API.Services;

public record InvoiceItemDto(
    string  ProductName,
    int     Quantity,
    decimal UnitPrice,
    decimal Subtotal
);

public record LowStockItemDto(
    int    ProductId,
    string ProductName,
    string SKU,
    int    StockQty
);

public interface IEmailService
{
    // Used by NotificationsController
    Task SendInvoiceAsync(
        string               toEmail,
        string               customerName,
        int                  orderId,
        decimal              totalAmount,
        decimal              discountAmount,
        string               orderStatus,
        List<InvoiceItemDto> items
    );

    // Used by OrderService — same method different name
    Task SendInvoiceEmailAsync(
        string               toEmail,
        string               customerName,
        int                  orderId,
        decimal              totalAmount,
        decimal              discountAmount,
        string               orderStatus,
        List<InvoiceItemDto> items
    );

    Task SendLowStockAlertAsync(
        string                adminEmail,
        List<LowStockItemDto> items
    );

    Task SendOverdueCreditReminderAsync(
        string   toEmail,
        string   customerName,
        decimal  totalOwed,
        DateTime earliestDueDate
    );
}