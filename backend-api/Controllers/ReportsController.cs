using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    public ReportsController(AppDbContext context) => _context = context;

    // GET /api/reports/daily?date=2026-05-28
    [HttpGet("daily")]
    public async Task<IActionResult> Daily([FromQuery] DateTime? date)
    {
        var targetDate = date?.Date ?? DateTime.UtcNow.Date;

        var orders = await _context.Orders
            .Where(o => o.OrderDate.Date == targetDate)
            .ToListAsync();

        return Ok(new
        {
            date = targetDate.ToString("yyyy-MM-dd"),
            totalOrders = orders.Count,
            totalRevenue = orders.Sum(o => o.TotalAmount),
            totalDiscount = orders.Sum(o => o.DiscountAmount),
            netRevenue = orders.Sum(o => o.TotalAmount)
        });
    }

    // GET /api/reports/monthly?year=2026&month=5
    [HttpGet("monthly")]
    public async Task<IActionResult> Monthly([FromQuery] int? year, [FromQuery] int? month)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;

        var orders = await _context.Orders
            .Where(o => o.OrderDate.Year == y && o.OrderDate.Month == m)
            .ToListAsync();

        // Group by day
        var daily = orders
            .GroupBy(o => o.OrderDate.Day)
            .Select(g => new
            {
                day = g.Key,
                orders = g.Count(),
                revenue = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.day)
            .ToList();

        return Ok(new
        {
            year = y,
            month = m,
            totalOrders = orders.Count,
            totalRevenue = orders.Sum(o => o.TotalAmount),
            totalDiscount = orders.Sum(o => o.DiscountAmount),
            netRevenue = orders.Sum(o => o.TotalAmount),
            dailyBreakdown = daily
        });
    }

    // GET /api/reports/yearly?year=2026
    [HttpGet("yearly")]
    public async Task<IActionResult> Yearly([FromQuery] int? year)
    {
        var y = year ?? DateTime.UtcNow.Year;

        var orders = await _context.Orders
            .Where(o => o.OrderDate.Year == y)
            .ToListAsync();

        // Group by month
        var monthly = orders
            .GroupBy(o => o.OrderDate.Month)
            .Select(g => new
            {
                month = g.Key,
                monthName = new DateTime(y, g.Key, 1).ToString("MMMM"),
                orders = g.Count(),
                revenue = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.month)
            .ToList();

        return Ok(new
        {
            year = y,
            totalOrders = orders.Count,
            totalRevenue = orders.Sum(o => o.TotalAmount),
            totalDiscount = orders.Sum(o => o.DiscountAmount),
            netRevenue = orders.Sum(o => o.TotalAmount),
            monthlyBreakdown = monthly
        });
    }

    // GET /api/reports/summary — quick overview for dashboard
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var startOfYear = new DateTime(now.Year, 1, 1);

        var allOrders = await _context.Orders.ToListAsync();

        return Ok(new
        {
            today = new
            {
                orders = allOrders.Count(o => o.OrderDate.Date == today),
                revenue = allOrders.Where(o => o.OrderDate.Date == today).Sum(o => o.TotalAmount)
            },
            thisMonth = new
            {
                orders = allOrders.Count(o => o.OrderDate >= startOfMonth),
                revenue = allOrders.Where(o => o.OrderDate >= startOfMonth).Sum(o => o.TotalAmount)
            },
            thisYear = new
            {
                orders = allOrders.Count(o => o.OrderDate >= startOfYear),
                revenue = allOrders.Where(o => o.OrderDate >= startOfYear).Sum(o => o.TotalAmount)
            },
            allTime = new
            {
                orders = allOrders.Count,
                revenue = allOrders.Sum(o => o.TotalAmount)
            }
        });
    }
}
