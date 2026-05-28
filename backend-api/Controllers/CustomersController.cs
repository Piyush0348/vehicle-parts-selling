using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using AutoServe.API.DTOs;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomersController(AppDbContext context) => _context = context;

    [Authorize(Roles = "Admin,Staff")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 1000)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 5000) pageSize = 1000;

        var customers = await _context.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerDetailDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Email = c.Email,
                Phone = c.Phone,
                Vehicles = c.Vehicles.Select(v => new VehicleDto
                {
                    VehicleNumber = v.VehicleNumber,
                    VehicleMake = v.VehicleMake,
                    VehicleModel = v.VehicleModel,
                    ManufacturingYear = v.ManufacturingYear,
                    VehicleType = v.VehicleType,
                    Color = v.Color
                }).ToList()
            })
            .ToListAsync();

        return Ok(customers);
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpGet("reports/summary")]
    public async Task<IActionResult> GetReports()
    {
        var regulars = await _context.Orders
            .GroupBy(o => o.CustomerId)
            .Where(g => g.Count() >= 2)
            .Select(g => g.Key)
            .ToListAsync();

        var highSpenders = await _context.Orders
            .Where(o => o.TotalAmount > 10000)
            .Select(o => o.CustomerId)
            .Distinct()
            .ToListAsync();

        var report = new
        {
            totalCustomers = await _context.Customers.CountAsync(c => c.Role == "Customer"),
            regularCustomers = await _context.Customers.Where(c => regulars.Contains(c.Id)).CountAsync(),
            highSpenders = await _context.Customers.Where(c => highSpenders.Contains(c.Id)).CountAsync(),
            pendingFollowups = await _context.Vehicles.CountAsync(v => v.DateAdded < DateTime.UtcNow.AddMonths(-6))
        };

        return Ok(report);
    }

    [Authorize(Roles = "Admin,Staff,Customer")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var customer = await _context.Customers
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null)
            return NotFound();

        return Ok(new CustomerDetailDto
        {
            Id = customer.Id,
            FirstName = customer.FirstName,
            LastName = customer.LastName,
            Email = customer.Email,
            Phone = customer.Phone,
            Vehicles = customer.Vehicles.Select(v => new VehicleDto
            {
                Id = v.Id,
                VehicleNumber = v.VehicleNumber,
                VehicleMake = v.VehicleMake,
                VehicleModel = v.VehicleModel,
                ManufacturingYear = v.ManufacturingYear,
                VehicleType = v.VehicleType,
                Color = v.Color,
                CustomerId = v.CustomerId
            }).ToList()
        });
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateCustomerDto dto)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Email == dto.Email);
        if (exists) return BadRequest("Email already exists");

        var customer = new Customer
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = dto.Password,
            Role = "Customer"
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, new CustomerDto
        {
            Id = customer.Id,
            FirstName = customer.FirstName,
            LastName = customer.LastName,
            Email = customer.Email,
            Phone = customer.Phone
        });
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateCustomerDto dto)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        customer.FirstName = dto.FirstName;
        customer.LastName = dto.LastName;
        customer.Email = dto.Email;
        customer.Phone = dto.Phone;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpGet("staff")]
    public async Task<IActionResult> GetStaff()
    {
        var staff = await _context.Customers
            .Where(c => c.Role == "Staff")
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Email = c.Email,
                Phone = c.Phone
            })
            .ToListAsync();

        return Ok(staff);
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpPost("staff")]
    public async Task<IActionResult> CreateStaff(CreateCustomerDto dto)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Email == dto.Email);
        if (exists) return BadRequest("Email already exists");

        var staff = new Customer
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = dto.Password,
            Role = "Staff"
        };

        _context.Customers.Add(staff);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Staff created successfully" });
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpPut("staff/{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, string role)
    {
        var user = await _context.Customers.FindAsync(id);
        if (user == null) return NotFound();

        user.Role = role;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Role updated successfully" });
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpDelete("staff/{id:int}")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var user = await _context.Customers.FindAsync(id);
        if (user == null) return NotFound();

        if (user.Role != "Staff")
            return BadRequest("User is not staff");

        _context.Customers.Remove(user);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin,Staff")]
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Search query is required");

        query = query.Trim().ToLower();

        int.TryParse(query, out int idQuery);

        var customers = await _context.Customers
            .Include(c => c.Vehicles)
            .Where(c => 
                c.Id == idQuery ||
                c.FirstName.ToLower().Contains(query) ||
                c.LastName.ToLower().Contains(query) ||
                c.Email.ToLower().Contains(query) ||
                (c.Phone != null && c.Phone.Contains(query)) ||
                c.Vehicles.Any(v => v.VehicleNumber.ToLower().Contains(query))
            )
            .Select(c => new CustomerDetailDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Email = c.Email,
                Phone = c.Phone,
                Vehicles = c.Vehicles.Select(v => new VehicleDto
                {
                    VehicleNumber = v.VehicleNumber,
                    VehicleMake = v.VehicleMake,
                    VehicleModel = v.VehicleModel,
                    ManufacturingYear = v.ManufacturingYear,
                    VehicleType = v.VehicleType,
                    Color = v.Color
                }).ToList()
            })
            .ToListAsync();

        return Ok(customers);
    }


    /// <summary>
    /// Register new customer with vehicle details
    /// </summary>
    [AllowAnonymous]
    [HttpPost("register-with-vehicles")]
    public async Task<IActionResult> RegisterWithVehicles([FromBody] CreateCustomerWithVehicleDto dto)
    {
        // Validate email uniqueness
        var emailExists = await _context.Customers.AnyAsync(c => c.Email == dto.Email);
        if (emailExists)
            return BadRequest(new { message = "Email already registered" });

        try
        {
            var customer = new Customer
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = "customer123", // Default password for new portal registrations
                Role = "Customer",
                Vehicles = new List<Vehicle>()
            };

            // Add vehicles
            if (dto.Vehicles != null && dto.Vehicles.Any())
            {
                foreach (var vehicleDto in dto.Vehicles)
                {
                    customer.Vehicles.Add(new Vehicle
                    {
                        VehicleNumber = vehicleDto.VehicleNumber,
                        VehicleMake = vehicleDto.VehicleMake,
                        VehicleModel = vehicleDto.VehicleModel,
                        ManufacturingYear = vehicleDto.ManufacturingYear,
                        VehicleType = vehicleDto.VehicleType,
                        Color = vehicleDto.Color,
                        DateAdded = DateTime.UtcNow
                    });
                }
            }

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = customer.Id }, new CustomerDetailDto
            {
                Id = customer.Id,
                FirstName = customer.FirstName,
                LastName = customer.LastName,
                Email = customer.Email,
                Phone = customer.Phone,
                Vehicles = customer.Vehicles.Select(v => new VehicleDto
                {
                    VehicleNumber = v.VehicleNumber,
                    VehicleMake = v.VehicleMake,
                    VehicleModel = v.VehicleModel,
                    ManufacturingYear = v.ManufacturingYear,
                    VehicleType = v.VehicleType,
                    Color = v.Color
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error registering customer", error = ex.Message });
        }
    }

    /// <summary>
    /// Generate customer reports (regulars, high spenders, pending credits)
    /// </summary>
    [Authorize(Roles = "Admin,Staff")]
    [HttpGet("reports")]
    public async Task<IActionResult> GetCustomerReports([FromQuery] string type)
    {
        if (string.IsNullOrEmpty(type))
            return BadRequest(new { message = "Report type is required (regulars, high-spenders, pending-credits)" });

        type = type.ToLower();

        if (type == "regulars")
        {
            // Regulars: customers with 2 or more completed orders
            var regulars = await _context.Customers
                .Include(c => c.Orders)
                .Where(c => c.Role == "Customer" && _context.Orders.Count(o => o.CustomerId == c.Id && o.Status == "Completed") >= 2)
                .Select(c => new
                {
                    Id = c.Id,
                    Name = $"{c.FirstName} {c.LastName}",
                    Email = c.Email,
                    Phone = c.Phone,
                    TotalOrders = _context.Orders.Count(o => o.CustomerId == c.Id && o.Status == "Completed"),
                    TotalSpent = _context.Orders.Where(o => o.CustomerId == c.Id && o.Status == "Completed").Sum(o => o.TotalAmount)
                })
                .OrderByDescending(r => r.TotalOrders)
                .ToListAsync();

            return Ok(regulars);
        }
        else if (type == "high-spenders")
        {
            // High spenders: total spent > 10,000
            var highSpenders = await _context.Customers
                .Include(c => c.Orders)
                .Where(c => c.Role == "Customer" && _context.Orders.Where(o => o.CustomerId == c.Id && o.Status == "Completed").Sum(o => o.TotalAmount) >= 10000)
                .Select(c => new
                {
                    Id = c.Id,
                    Name = $"{c.FirstName} {c.LastName}",
                    Email = c.Email,
                    Phone = c.Phone,
                    TotalOrders = _context.Orders.Count(o => o.CustomerId == c.Id && o.Status == "Completed"),
                    TotalSpent = _context.Orders.Where(o => o.CustomerId == c.Id && o.Status == "Completed").Sum(o => o.TotalAmount)
                })
                .OrderByDescending(h => h.TotalSpent)
                .ToListAsync();

            return Ok(highSpenders);
        }
        else if (type == "pending-credits")
        {
            // Pending credits: customers who have any orders that are "Unpaid" or "Pending"
            var pendingCredits = await _context.Customers
                .Include(c => c.Orders)
                .Where(c => c.Role == "Customer" && _context.Orders.Any(o => o.CustomerId == c.Id && (o.Status == "Unpaid" || o.Status == "Pending" || o.Status == "Overdue")))
                .Select(c => new
                {
                    Id = c.Id,
                    Name = $"{c.FirstName} {c.LastName}",
                    Email = c.Email,
                    Phone = c.Phone,
                    UnpaidOrdersCount = _context.Orders.Count(o => o.CustomerId == c.Id && (o.Status == "Unpaid" || o.Status == "Pending" || o.Status == "Overdue")),
                    TotalUnpaidAmount = _context.Orders.Where(o => o.CustomerId == c.Id && (o.Status == "Unpaid" || o.Status == "Pending" || o.Status == "Overdue")).Sum(o => o.TotalAmount)
                })
                .OrderByDescending(p => p.TotalUnpaidAmount)
                .ToListAsync();

            return Ok(pendingCredits);
        }
        else
        {
            return BadRequest(new { message = "Invalid report type. Allowed: regulars, high-spenders, pending-credits" });
        }
    }
}