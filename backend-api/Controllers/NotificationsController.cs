using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.Services;

namespace AutoServe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public NotificationsController(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockItems()
    {
        var lowStockItems = await _context.Products
            .Where(p => p.StockQty < 10)
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .OrderBy(p => p.StockQty)
            .AsNoTracking()
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.SKU,
                p.StockQty,
                p.Price,
                CategoryName = p.Category!.Name,
                SupplierName = p.Supplier!.Name
            })
            .ToListAsync();

        return Ok(new
        {
            count = lowStockItems.Count,
            threshold = 10,
            items = lowStockItems
        });
    }

    [HttpPost("low-stock/send-alert")]
    public async Task<IActionResult> SendLowStockAlert([FromBody] LowStockAlertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AdminEmail))
            return BadRequest(new { message = "Admin email is required." });

        var lowStockItems = await _context.Products
            .Where(p => p.StockQty < 10)
            .OrderBy(p => p.StockQty)
            .AsNoTracking()
            .Select(p => new LowStockItemDto(p.Id, p.Name, p.SKU, p.StockQty))
            .ToListAsync();

        if (lowStockItems.Count == 0)
            return Ok(new { message = "No low stock items found. No alert sent." });

        try
        {
            await _emailService.SendLowStockAlertAsync(request.AdminEmail, lowStockItems);
            return Ok(new { message = $"Low stock alert sent to {request.AdminEmail} for {lowStockItems.Count} items." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to send alert: {ex.Message}" });
        }
    }

    [HttpGet("overdue-credits")]
    public async Task<IActionResult> GetOverdueCredits()
    {
        var cutoffDate = DateTime.UtcNow.AddMonths(-1);

        var overdueOrders = await _context.Orders
            .Where(o => o.Status == "Pending" && o.OrderDate < cutoffDate)
            .Include(o => o.Customer)
            .OrderBy(o => o.OrderDate)
            .AsNoTracking()
            .ToListAsync();

        var result = overdueOrders.Select(o => new
        {
            o.Id,
            o.OrderDate,
            o.TotalAmount,
            o.DiscountAmount,
            AmountOwed = o.TotalAmount - o.DiscountAmount,
            o.CustomerId,
            CustomerName = o.Customer!.FirstName + " " + o.Customer!.LastName,
            CustomerEmail = o.Customer!.Email,
            DaysOverdue = (int)(DateTime.UtcNow - o.OrderDate).TotalDays
        }).ToList();

        return Ok(new
        {
            count = result.Count,
            orders = result
        });
    }

    [HttpPost("overdue-credits/send-reminders")]
    public async Task<IActionResult> SendOverdueReminders()
    {
        var cutoffDate = DateTime.UtcNow.AddMonths(-1);

        var overdueOrders = await _context.Orders
            .Where(o => o.Status == "Pending" && o.OrderDate < cutoffDate)
            .Include(o => o.Customer)
            .OrderBy(o => o.OrderDate)
            .AsNoTracking()
            .ToListAsync();

        if (overdueOrders.Count == 0)
            return Ok(new { message = "No overdue credits found. No reminders sent.", sent = 0 });

        var grouped = overdueOrders
            .GroupBy(o => o.CustomerId)
            .Select(g => new
            {
                Customer = g.First().Customer!,
                TotalOwed = g.Sum(o => o.TotalAmount - o.DiscountAmount),
                EarliestDueDate = g.Min(o => o.OrderDate)
            })
            .ToList();

        var sent = 0;
        var failed = 0;

        foreach (var entry in grouped)
        {
            try
            {
                var customerName = entry.Customer.FirstName + " " + entry.Customer.LastName;
                await _emailService.SendOverdueCreditReminderAsync(
                    entry.Customer.Email,
                    customerName,
                    entry.TotalOwed,
                    entry.EarliestDueDate
                );
                sent++;
            }
            catch
            {
                failed++;
            }
        }

        return Ok(new
        {
            message = "Reminders sent to " + sent + " customer(s). Failed: " + failed + ".",
            sent,
            failed
        });
    }

    [HttpPost("send-invoice/{orderId:int}")]
    public async Task<IActionResult> SendInvoiceEmail(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            return NotFound(new { message = $"Order with ID {orderId} was not found." });

        if (string.IsNullOrWhiteSpace(order.Customer?.Email))
            return BadRequest(new { message = "Customer does not have an email address." });

        var customerName = order.Customer.FirstName + " " + order.Customer.LastName;

        var items = order.OrderItems.Select(oi => new InvoiceItemDto(
            oi.Product?.Name ?? "Unknown",
            oi.Quantity,
            oi.UnitPrice,
            oi.Quantity * oi.UnitPrice
        )).ToList();

        try
        {
            await _emailService.SendInvoiceAsync(
                order.Customer.Email,
                customerName,
                order.Id,
                order.TotalAmount,
                order.DiscountAmount,
                order.Status,
                items
            );

            return Ok(new { message = $"Invoice email sent to {order.Customer.Email} for Order #{orderId}." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to send invoice: {ex.Message}" });
        }
    }
}

public class LowStockAlertRequest
{
    public string AdminEmail { get; set; } = string.Empty;
}