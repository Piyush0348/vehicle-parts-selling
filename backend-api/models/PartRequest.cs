public class PartRequest
{
    public int Id { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string? PartNumber { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;
}