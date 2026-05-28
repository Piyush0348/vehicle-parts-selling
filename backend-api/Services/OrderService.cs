// Services/OrderService.cs
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public OrderService(AppDbContext context, IEmailService emailService)
    {
        _context      = context;
        _emailService = emailService;
    }

    // ── Calculate total and loyalty discount ───────────────────────────
    public (decimal total, decimal discount) CalculateTotal(
        List<OrderItem> items)
    {
        var subtotal = items.Sum(i => i.UnitPrice * i.Quantity);

        // 10% loyalty discount if subtotal > 5000
        decimal discount = subtotal > 5000
            ? subtotal * 0.10m
            : 0;

        return (subtotal - discount, discount);
    }

    // ── Create basic order ─────────────────────────────────────────────
    public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto)
    {
        var items = dto.Items?
            .Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity  = i.Quantity,
                UnitPrice = i.UnitPrice
            })
            .ToList() ?? new List<OrderItem>();

        var (total, discount) = CalculateTotal(items);

        var order = new Order
        {
            OrderDate      = dto.OrderDate,
            Status         = dto.Status,
            CustomerId     = dto.CustomerId,
            TotalAmount    = total,
            DiscountAmount = discount,
            OrderItems     = items
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return new OrderDto
        {
            Id             = order.Id,
            OrderDate      = order.OrderDate,
            Status         = order.Status,
            CustomerId     = order.CustomerId,
            ItemCount      = order.OrderItems.Count,
            TotalAmount    = order.TotalAmount,
            DiscountAmount = order.DiscountAmount
        };
    }

    // ── Create sales invoice and send email ────────────────────────────
    public async Task<OrderWithDetailsDto> CreateSalesInvoiceAsync(
        CreateOrderDto dto)
    {
        // Validate customer exists
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
            throw new KeyNotFoundException("Customer not found");

        // Build order items
        var items = dto.Items?
            .Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity  = i.Quantity,
                UnitPrice = i.UnitPrice
            })
            .ToList() ?? new List<OrderItem>();

        var (total, discount) = CalculateTotal(items);

        // Create and save the order
        var order = new Order
        {
            OrderDate      = dto.OrderDate,
            Status         = "Completed",
            CustomerId     = dto.CustomerId,
            TotalAmount    = total,
            DiscountAmount = discount,
            OrderItems     = items
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // ── Send invoice email ─────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(customer.Email))
        {
            try
            {
                // Fetch product names from database
                var productIds  = items.Select(oi => oi.ProductId).ToList();
                var productsMap = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, p => p.Name);

                // Build InvoiceItemDto list (matches IEmailService signature)
                var invoiceItems = items
                    .Select(oi => new InvoiceItemDto(
                        ProductName: productsMap.TryGetValue(
                                         oi.ProductId, out var name)
                                         ? name
                                         : "Vehicle Part",
                        Quantity:    oi.Quantity,
                        UnitPrice:   oi.UnitPrice,
                        Subtotal:    oi.Quantity * oi.UnitPrice
                    ))
                    .ToList();

                var customerName = $"{customer.FirstName} {customer.LastName}".Trim();

                await _emailService.SendInvoiceEmailAsync(
                    toEmail:        customer.Email,
                    customerName:   customerName,
                    orderId:        order.Id,       
                    totalAmount:    total,            
                    discountAmount: discount,         
                    orderStatus:    order.Status,     
                    items:          invoiceItems      
                );
            }
            catch (Exception emailEx)
            {
                // Log but do not fail the order if email fails
                Console.WriteLine(
                    $"[EMAIL DISPATCH FAIL] {emailEx.Message}");
            }
        }

        // ── Build product name map for response ────────────────────────
        var productNameMap = await _context.Products
            .Where(p => items.Select(i => i.ProductId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name);

        return new OrderWithDetailsDto
        {
            Id             = order.Id,
            OrderDate      = order.OrderDate,
            Status         = order.Status,
            TotalAmount    = order.TotalAmount,
            DiscountAmount = order.DiscountAmount,

            Customer = new CustomerDto
            {
                Id        = customer.Id,
                FirstName = customer.FirstName,
                LastName  = customer.LastName,
                Email     = customer.Email,
                Phone     = customer.Phone
            },

            OrderItems = items
                .Select(oi => new OrderItemSummaryDto
                {
                    ProductId   = oi.ProductId,
                    ProductName = productNameMap.TryGetValue(
                                      oi.ProductId, out var n)
                                      ? n
                                      : "Vehicle Part",
                    Quantity    = oi.Quantity,
                    UnitPrice   = oi.UnitPrice
                })
                .ToList()
        };
    }
}