using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class Supplier
{
    public int Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? ContactPerson { get; set; }
    
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    public string? Phone { get; set; }
    
    [JsonIgnore]
    public ICollection<Product> Products { get; set; } = new List<Product>();
}