using System.ComponentModel.DataAnnotations;

namespace AutoServe.API.DTOs;

public class CreatePartRequestDto
{
    [Required]
    public string PartName { get; set; } = string.Empty;

    public string? PartNumber { get; set; }
    public string? Description { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [Required]
    public int VehicleId { get; set; }
}

public class UpdatePartRequestDto
{
    [Required]
    public string PartName { get; set; } = string.Empty;

    public string? PartNumber { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "Pending";

    [Required]
    public int VehicleId { get; set; }
}

public class PartRequestDto
{
    public int Id { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string? PartNumber { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int VehicleId { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
}