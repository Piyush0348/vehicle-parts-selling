using System.ComponentModel.DataAnnotations;

namespace AutoServe.API.DTOs;

public class VehicleDto
{
    public int Id { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
    public string VehicleMake { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public int ManufacturingYear { get; set; }
    public string? VehicleType { get; set; }
    public string? Color { get; set; }
    public int CustomerId { get; set; }
}

public class CreateVehicleDto
{
    [Required]
    public string VehicleNumber { get; set; } = string.Empty;

    [Required]
    public string VehicleMake { get; set; } = string.Empty;

    [Required]
    public string VehicleModel { get; set; } = string.Empty;

    [Range(1900, 2100)]
    public int ManufacturingYear { get; set; }

    public string? VehicleType { get; set; }
    public string? Color { get; set; }

    [Required]
    public int CustomerId { get; set; }
}

public class UpdateVehicleDto
{
    [Required]
    public string VehicleNumber { get; set; } = string.Empty;

    [Required]
    public string VehicleMake { get; set; } = string.Empty;

    [Required]
    public string VehicleModel { get; set; } = string.Empty;

    [Range(1900, 2100)]
    public int ManufacturingYear { get; set; }

    public string? VehicleType { get; set; }
    public string? Color { get; set; }
}

public class ServiceRecordDto
{
    public int Id { get; set; }
    public DateTime ServiceDate { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal TotalCost { get; set; }
    public string Status { get; set; } = string.Empty;
    public int VehicleId { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
}

public class CreateServiceRecordDto
{
    [Required]
    public DateTime ServiceDate { get; set; }

    [Required]
    public string ServiceType { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(0, double.MaxValue)]
    public decimal TotalCost { get; set; }

    public string Status { get; set; } = "Pending";

    [Required]
    public int VehicleId { get; set; }
}

public class CustomerHistoryDto
{
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public List<VehicleWithServiceDto> Vehicles { get; set; } = new();
    public List<PurchaseHistoryItemDto> PurchaseHistory { get; set; } = new();
    public HistorySummaryDto Summary { get; set; } = new();
}

public class VehicleWithServiceDto
{
    public int Id { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
    public string VehicleMake { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public int ManufacturingYear { get; set; }
    public string? Color { get; set; }
    public List<ServiceRecordDto> ServiceHistory { get; set; } = new();
}

public class PurchaseHistoryItemDto
{
    public int OrderId { get; set; }
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public List<OrderItemSummaryDto> Items { get; set; } = new();
}

public class HistorySummaryDto
{
    public int TotalOrders { get; set; }
    public decimal TotalSpent { get; set; }
    public int TotalVehicles { get; set; }
    public int TotalServiceVisits { get; set; }
    public decimal TotalServiceCost { get; set; }
}
