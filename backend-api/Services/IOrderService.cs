using System.Collections.Generic;
using System.Threading.Tasks;
using AutoServe.API.DTOs;

namespace AutoServe.API.Services
{
    public interface IOrderService
    {
        Task<OrderDto> CreateOrderAsync(CreateOrderDto dto);
        Task<OrderWithDetailsDto> CreateSalesInvoiceAsync(CreateOrderDto dto);
        (decimal total, decimal discount) CalculateTotal(List<OrderItem> items);
    }
}
