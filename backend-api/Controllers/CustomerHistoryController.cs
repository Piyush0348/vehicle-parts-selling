using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Controllers;

[ApiController]
[Route("api/customers/{customerId:int}/history")]
public class CustomerHistoryController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomerHistoryController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetHistory(int customerId)
    {
        var customer = await _context.Customers
            .Where(c => c.Id == customerId)
            .Include(c => c.Orders)
                .ThenInclude(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
            .Include(c => c.Vehicles)
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (customer == null)
            return NotFound(new { message = $"Customer with ID {customerId} was not found." });

        var purchaseHistory = customer.Orders
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new PurchaseHistoryItemDto
            {
                OrderId     = o.Id,
                OrderDate   = o.OrderDate,
                Status      = o.Status,
                TotalAmount = o.TotalAmount,
                DiscountAmount = o.DiscountAmount,
                Items = o.OrderItems.Select(oi => new OrderItemSummaryDto
                {
                    ProductId   = oi.ProductId,
                    ProductName = oi.Product?.Name ?? "Unknown",
                    Quantity    = oi.Quantity,
                    UnitPrice   = oi.UnitPrice
                }).ToList()
            }).ToList();

        var vehicles = customer.Vehicles
            .OrderBy(v => v.VehicleNumber)
            .Select(v => new VehicleWithServiceDto
            {
                Id                = v.Id,
                VehicleNumber     = v.VehicleNumber,
                VehicleMake       = v.VehicleMake,
                VehicleModel      = v.VehicleModel,
                ManufacturingYear = v.ManufacturingYear,
                Color             = v.Color,
                ServiceHistory    = new List<ServiceRecordDto>() // ServiceRecords table not yet available
            }).ToList();

        var summary = new HistorySummaryDto
        {
            TotalOrders        = purchaseHistory.Count,
            TotalSpent         = purchaseHistory.Sum(p => p.TotalAmount),
            TotalVehicles      = vehicles.Count,
            TotalServiceVisits = vehicles.Sum(v => v.ServiceHistory.Count),
            TotalServiceCost   = vehicles.Sum(v => v.ServiceHistory.Sum(sr => sr.TotalCost))
        };

        var result = new CustomerHistoryDto
        {
            CustomerId      = customer.Id,
            CustomerName    = $"{customer.FirstName} {customer.LastName}",
            Email           = customer.Email,
            Phone           = customer.Phone,
            Vehicles        = vehicles,
            PurchaseHistory = purchaseHistory,
            Summary         = summary
        };

        return Ok(result);
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> GetPurchases(int customerId)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists)
            return NotFound(new { message = $"Customer with ID {customerId} was not found." });

        var orders = await _context.Orders
            .Where(o => o.CustomerId == customerId)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .OrderByDescending(o => o.OrderDate)
            .AsNoTracking()
            .Select(o => new PurchaseHistoryItemDto
            {
                OrderId     = o.Id,
                OrderDate   = o.OrderDate,
                Status      = o.Status,
                TotalAmount = o.OrderItems.Sum(oi => oi.Quantity * oi.UnitPrice),
                Items = o.OrderItems.Select(oi => new OrderItemSummaryDto
                {
                    ProductId   = oi.ProductId,
                    ProductName = oi.Product != null ? oi.Product.Name : "Unknown",
                    Quantity    = oi.Quantity,
                    UnitPrice   = oi.UnitPrice
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("services")]
    public async Task<IActionResult> GetServices(int customerId)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists)
            return NotFound(new { message = $"Customer with ID {customerId} was not found." });

        var serviceRecords = await _context.ServiceRecords
            .Where(sr => sr.Vehicle.CustomerId == customerId)
            .Include(sr => sr.Vehicle)
            .OrderByDescending(sr => sr.ServiceDate)
            .AsNoTracking()
            .Select(sr => new ServiceRecordDto
            {
                Id            = sr.Id,
                ServiceDate   = sr.ServiceDate,
                ServiceType   = sr.ServiceType,
                Description   = sr.Description,
                TotalCost     = sr.TotalCost,
                Status        = sr.Status,
                VehicleId     = sr.VehicleId,
                VehicleNumber = sr.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(serviceRecords);
    }
}
