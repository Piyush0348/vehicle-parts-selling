public class ServiceRecord
{
    public int Id { get; set; }
    public DateTime ServiceDate { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal TotalCost { get; set; }
    public string Status { get; set; } = "Pending";

    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
}
