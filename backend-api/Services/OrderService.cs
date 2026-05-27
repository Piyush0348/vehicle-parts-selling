using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Services
{
    public class OrderService : IOrderService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public OrderService(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public (decimal total, decimal discount) CalculateTotal(List<OrderItem> items)
        {
            var subtotal = items.Sum(i => i.UnitPrice * i.Quantity);

            decimal discount = 0;
            if (subtotal > 5000)
            {
                discount = subtotal * 0.10m;
            }

            var total = subtotal - discount;
            return (total, discount);
        }

        public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto)
        {
            var items = dto.Items?.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList() ?? new List<OrderItem>();

            var result = CalculateTotal(items);

            var order = new Order
            {
                OrderDate = dto.OrderDate,
                Status = dto.Status,
                CustomerId = dto.CustomerId,
                TotalAmount = result.total,
                DiscountAmount = result.discount,
                OrderItems = items
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return new OrderDto
            {
                Id = order.Id,
                OrderDate = order.OrderDate,
                Status = order.Status,
                CustomerId = order.CustomerId,
                ItemCount = order.OrderItems.Count,
                TotalAmount = order.TotalAmount,
                DiscountAmount = order.DiscountAmount
            };
        }

        public async Task<OrderWithDetailsDto> CreateSalesInvoiceAsync(CreateOrderDto dto)
        {
            // Validate customer exists
            var customer = await _context.Customers.FindAsync(dto.CustomerId);
            if (customer == null)
                throw new KeyNotFoundException("Customer not found");

            var items = dto.Items?.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList() ?? new List<OrderItem>();

            var result = CalculateTotal(items);

            var order = new Order
            {
                OrderDate = dto.OrderDate,
                Status = "Completed",
                CustomerId = dto.CustomerId,
                TotalAmount = result.total,
                DiscountAmount = result.discount,
                OrderItems = items
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Trigger invoice email sending within the request scope to guarantee execution and resolve product details
            if (!string.IsNullOrEmpty(customer.Email))
            {
                // Fetch product details inside request scope before the context is disposed
                var productIds = items.Select(oi => oi.ProductId).ToList();
                var productsMap = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, p => p.Name);

                var orderSummaryItems = items.Select(oi => new OrderItemSummaryDto
                {
                    ProductId = oi.ProductId,
                    ProductName = productsMap.TryGetValue(oi.ProductId, out var name) ? name : "Vehicle Part",
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice
                }).ToList();

                string toEmail = customer.Email;
                string toName = $"{customer.FirstName} {customer.LastName}".Trim();
                string invoiceNo = $"INV-{order.Id:D5}";
                decimal subTotal = items.Sum(i => i.UnitPrice * i.Quantity);
                decimal discountAmt = result.discount;
                decimal totalAmt = result.total;

                try
                {
                    await _emailService.SendInvoiceEmailAsync(toEmail, toName, invoiceNo, subTotal, discountAmt, totalAmt, orderSummaryItems);
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine($"[EMAIL DISPATCH FAIL] {emailEx.Message}");
                }
            }

            return new OrderWithDetailsDto
            {
                Id = order.Id,
                OrderDate = order.OrderDate,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                DiscountAmount = order.DiscountAmount,
                Customer = new CustomerDto
                {
                    Id = customer.Id,
                    FirstName = customer.FirstName,
                    LastName = customer.LastName,
                    Email = customer.Email,
                    Phone = customer.Phone
                },
                OrderItems = items.Select(oi => new OrderItemSummaryDto
                {
                    ProductId = oi.ProductId,
                    ProductName = _context.Products.Find(oi.ProductId)?.Name ?? "Vehicle Part",
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice
                }).ToList()
            };
        }
    }
}
