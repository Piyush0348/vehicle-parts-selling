using System.ComponentModel.DataAnnotations;

namespace AutoServe.API.DTOs;

public class CreateCustomerDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UpdateCustomerDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }
}

public class CustomerDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class CustomerDetailDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public List<VehicleDto> Vehicles { get; set; } = new();
}

public class CreateCustomerVehicleDto
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

public class CreateCustomerWithVehicleDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "At least one vehicle is required")]
    public List<CreateCustomerVehicleDto> Vehicles { get; set; } = new();
}