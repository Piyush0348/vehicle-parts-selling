using System.ComponentModel.DataAnnotations;

namespace AutoServe.API.DTOs;

public class CreateSupplierDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class UpdateSupplierDto
{
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class SupplierWithProductsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public List<ProductSummaryDto> Products { get; set; } = new();
}

public class SupplierDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}