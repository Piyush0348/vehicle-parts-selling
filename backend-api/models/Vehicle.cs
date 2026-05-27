using System.ComponentModel.DataAnnotations;

public class Vehicle
{
    public int Id { get; set; }

    [Required]
    public string VehicleNumber { get; set; } = string.Empty;

    [Required]
    public string VehicleMake { get; set; } = string.Empty;

    [Required]
    public string VehicleModel { get; set; } = string.Empty;

    [Required]
    public int ManufacturingYear { get; set; }

    public string? VehicleType { get; set; }
    public string? Color { get; set; }
    public DateTime DateAdded { get; set; } = DateTime.UtcNow;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<PartRequest> PartRequests { get; set; } = new List<PartRequest>();
}