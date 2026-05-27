using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using AutoServe.API.Services;

[Authorize(Roles = "Admin,Staff")]
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IOrderService _orderService;

    public OrdersController(AppDbContext context, IOrderService orderService)
    {
        _context = context;
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(int page = 1, int pageSize = 20)
    {
        var query = _context.Orders.AsNoTracking();

        var totalCount = await query.CountAsync();

        var orders = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                OrderDate = o.OrderDate,
                Status = o.Status,
                CustomerId = o.CustomerId,
                ItemCount = o.OrderItems.Count,
                TotalAmount = o.TotalAmount,
                DiscountAmount = o.DiscountAmount
            })
            .ToListAsync();

        return Ok(new { totalCount, page, pageSize, data = orders });
    }

    [HttpGet("with-details")]
    public async Task<IActionResult> GetWithDetails(int count = 10)
    {
        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
            .OrderByDescending(o => o.OrderDate)
            .Take(count)
            .Select(o => new OrderWithDetailsDto
            {
                Id = o.Id,
                OrderDate = o.OrderDate,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                DiscountAmount = o.DiscountAmount,
                Customer = new CustomerDto
                {
                    Id = o.Customer != null ? o.Customer.Id : 0,
                    FirstName = o.Customer != null ? o.Customer.FirstName : "N/A",
                    LastName = o.Customer != null ? o.Customer.LastName : "",
                    Email = o.Customer != null ? o.Customer.Email : "",
                    Phone = o.Customer != null ? o.Customer.Phone : ""
                },
                OrderItems = o.OrderItems.Select(oi => new OrderItemSummaryDto
                {
                    ProductId = oi.ProductId,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(new OrderWithDetailsDto
        {
            Id = order.Id,
            OrderDate = order.OrderDate,
            Status = order.Status,
            TotalAmount = order.TotalAmount,
            DiscountAmount = order.DiscountAmount,
            Customer = new CustomerDto
            {
                Id = order.Customer != null ? order.Customer.Id : 0,
                FirstName = order.Customer != null ? order.Customer.FirstName : "N/A",
                LastName = order.Customer != null ? order.Customer.LastName : "",
                Email = order.Customer != null ? order.Customer.Email : "",
                Phone = order.Customer != null ? order.Customer.Phone : ""
            },
            OrderItems = order.OrderItems.Select(oi => new OrderItemSummaryDto
            {
                ProductId = oi.ProductId,
                ProductName = oi.Product?.Name ?? "Unknown",
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice
            }).ToList()
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderDto dto)
    {
        try
        {
            var result = await _orderService.CreateOrderAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("create-invoice")]
    public async Task<IActionResult> CreateSalesInvoice([FromBody] CreateOrderDto dto)
    {
        try
        {
            var result = await _orderService.CreateSalesInvoiceAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<IActionResult> GetCustomerOrders(int customerId)
    {
        var customer = await _context.Customers.FindAsync(customerId);
        if (customer == null)
            return NotFound(new { message = "Customer not found" });

        var orders = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new OrderDetailDto
            {
                Id = o.Id,
                OrderDate = o.OrderDate,
                Status = o.Status,
                CustomerId = o.CustomerId,
                TotalAmount = o.TotalAmount,
                DiscountAmount = o.DiscountAmount,
                OrderItems = o.OrderItems.Select(oi => new OrderItemSummaryDto
                {
                    ProductId = oi.ProductId,
                    ProductName = oi.Product != null ? oi.Product.Name : "Unknown",
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id:int}/invoice")]
    public async Task<IActionResult> GetInvoice(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        var invoice = new
        {
            InvoiceNumber = $"INV-{order.Id:D5}",
            InvoiceDate = order.OrderDate,
            Customer = new
            {
                Name = order.Customer != null ? $"{order.Customer.FirstName} {order.Customer.LastName}" : "Unknown",
                Email = order.Customer?.Email ?? "",
                Phone = order.Customer?.Phone ?? ""
            },
            Items = order.OrderItems.Select(oi => new
            {
                PartName = oi.Product?.Name ?? "Unknown",
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice,
                Subtotal = oi.Quantity * oi.UnitPrice
            }).ToList(),
            SubTotal = order.OrderItems.Sum(oi => oi.Quantity * oi.UnitPrice),
            DiscountAmount = order.DiscountAmount,
            TotalAmount = order.TotalAmount,
            Status = order.Status
        };

        return Ok(invoice);
    }

    [HttpGet("count")]
    public async Task<IActionResult> Count()
    {
        var totalOrders = await _context.Orders.CountAsync();
        return Ok(new { totalOrders });
    }

    [HttpGet("total-amount")]
    public async Task<IActionResult> TotalAmount()
    {
        var totalAmount = await _context.Orders.SumAsync(o => o.TotalAmount);
        return Ok(new { totalAmount });
    }
}