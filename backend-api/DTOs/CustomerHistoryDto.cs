// DTOs/CustomerHistoryDto.cs
namespace AutoServe.API.DTOs;

public class CustomerHistorySummaryDto
{
    public int     TotalOrders        { get; set; }
    public decimal TotalSpent         { get; set; }
    public int     TotalVehicles      { get; set; }
    public int     TotalServiceVisits { get; set; }
    public decimal TotalServiceCost   { get; set; }
}

public class OrderItemHistoryDto
{
    public string  ProductName { get; set; } = string.Empty;
    public int     Quantity    { get; set; }
    public decimal UnitPrice   { get; set; }
}

public class PurchaseHistoryDto
{
    public int                    OrderId         { get; set; }
    public DateTime               OrderDate       { get; set; }
    public decimal                TotalAmount     { get; set; }
    public string                 Status          { get; set; } = string.Empty;
    public List<OrderItemHistoryDto> Items        { get; set; } = new();
}

public class ServiceRecordHistoryDto
{
    public DateTime ServiceDate { get; set; }
    public string   ServiceType { get; set; } = string.Empty;
    public string?  Description { get; set; }
    public decimal  TotalCost   { get; set; }
    public string   Status      { get; set; } = string.Empty;
}

public class VehicleHistoryDto
{
    public int    VehicleId         { get; set; }
    public string VehicleNumber     { get; set; } = string.Empty;
    public string VehicleMake       { get; set; } = string.Empty;
    public string VehicleModel      { get; set; } = string.Empty;
    public int    ManufacturingYear { get; set; }
    public string? Color            { get; set; }
    public List<ServiceRecordHistoryDto> ServiceHistory { get; set; } = new();
}

public class CustomerHistoryResponseDto
{
    public int    CustomerId   { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Email        { get; set; } = string.Empty;
    public string? Phone       { get; set; }
    public CustomerHistorySummaryDto      Summary         { get; set; } = new();
    public List<PurchaseHistoryDto>       PurchaseHistory { get; set; } = new();
    public List<VehicleHistoryDto>        Vehicles        { get; set; } = new();
}