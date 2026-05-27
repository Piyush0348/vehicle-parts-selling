using System.ComponentModel.DataAnnotations;

namespace AutoServe.API.DTOs;

public class CreateAppointmentDto
{
    [Required]
    public DateTime AppointmentDate { get; set; }

    [Required]
    public string ServiceType { get; set; } = string.Empty;

    public string? Notes { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [Required]
    public int VehicleId { get; set; }
}

public class UpdateAppointmentDto
{
    [Required]
    public DateTime AppointmentDate { get; set; }

    [Required]
    public string ServiceType { get; set; } = string.Empty;

    public string? Notes { get; set; }
    public string Status { get; set; } = "Pending";
}

public class AppointmentDto
{
    public int Id { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int VehicleId { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
}