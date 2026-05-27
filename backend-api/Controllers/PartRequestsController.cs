using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Controllers;

[ApiController]
[Route("api/part-requests")]
public class PartRequestsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PartRequestsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var requests = await _context.PartRequests
            .Include(pr => pr.Customer)
            .Include(pr => pr.Vehicle)
            .OrderByDescending(pr => pr.CreatedAt)
            .AsNoTracking()
            .Select(pr => new PartRequestDto
            {
                Id = pr.Id,
                PartName = pr.PartName,
                PartNumber = pr.PartNumber,
                Description = pr.Description,
                Status = pr.Status,
                CreatedAt = pr.CreatedAt,
                CustomerId = pr.CustomerId,
                CustomerName = pr.Customer.FirstName + " " + pr.Customer.LastName,
                VehicleId = pr.VehicleId,
                VehicleNumber = pr.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var request = await _context.PartRequests
            .Include(pr => pr.Customer)
            .Include(pr => pr.Vehicle)
            .AsNoTracking()
            .Where(pr => pr.Id == id)
            .Select(pr => new PartRequestDto
            {
                Id = pr.Id,
                PartName = pr.PartName,
                PartNumber = pr.PartNumber,
                Description = pr.Description,
                Status = pr.Status,
                CreatedAt = pr.CreatedAt,
                CustomerId = pr.CustomerId,
                CustomerName = pr.Customer.FirstName + " " + pr.Customer.LastName,
                VehicleId = pr.VehicleId,
                VehicleNumber = pr.Vehicle.VehicleNumber
            })
            .FirstOrDefaultAsync();

        if (request == null)
            return NotFound(new { message = $"Part request with ID {id} was not found." });

        return Ok(request);
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<IActionResult> GetByCustomer(int customerId)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists)
            return NotFound(new { message = $"Customer with ID {customerId} was not found." });

        var requests = await _context.PartRequests
            .Where(pr => pr.CustomerId == customerId)
            .Include(pr => pr.Vehicle)
            .OrderByDescending(pr => pr.CreatedAt)
            .AsNoTracking()
            .Select(pr => new PartRequestDto
            {
                Id = pr.Id,
                PartName = pr.PartName,
                PartNumber = pr.PartNumber,
                Description = pr.Description,
                Status = pr.Status,
                CreatedAt = pr.CreatedAt,
                CustomerId = pr.CustomerId,
                CustomerName = "",
                VehicleId = pr.VehicleId,
                VehicleNumber = pr.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePartRequestDto dto)
    {
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
            return BadRequest(new { message = "Customer not found." });

        var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
        if (vehicle == null)
            return BadRequest(new { message = "Vehicle not found." });

        if (vehicle.CustomerId != dto.CustomerId)
            return BadRequest(new { message = "Vehicle does not belong to the specified customer." });

        var request = new PartRequest
        {
            PartName = dto.PartName,
            PartNumber = dto.PartNumber,
            Description = dto.Description,
            CustomerId = dto.CustomerId,
            VehicleId = dto.VehicleId
        };

        _context.PartRequests.Add(request);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = request.Id }, new PartRequestDto
        {
            Id = request.Id,
            PartName = request.PartName,
            PartNumber = request.PartNumber,
            Description = request.Description,
            Status = request.Status,
            CreatedAt = request.CreatedAt,
            CustomerId = request.CustomerId,
            CustomerName = customer.FirstName + " " + customer.LastName,
            VehicleId = request.VehicleId,
            VehicleNumber = vehicle.VehicleNumber
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdatePartRequestDto dto)
    {
        var request = await _context.PartRequests.FindAsync(id);
        if (request == null)
            return NotFound(new { message = $"Part request with ID {id} was not found." });

        var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
        if (vehicle == null)
            return BadRequest(new { message = "Vehicle not found." });

        if (vehicle.CustomerId != request.CustomerId)
            return BadRequest(new { message = "Vehicle does not belong to the request customer." });

        request.PartName = dto.PartName;
        request.PartNumber = dto.PartNumber;
        request.Description = dto.Description;
        request.Status = dto.Status;
        request.VehicleId = dto.VehicleId;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var request = await _context.PartRequests.FindAsync(id);
        if (request == null)
            return NotFound(new { message = $"Part request with ID {id} was not found." });

        _context.PartRequests.Remove(request);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}