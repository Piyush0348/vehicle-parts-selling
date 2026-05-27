using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Controllers;

/// <summary>
/// CRUD operations for vehicle service records.
/// Supports Feature 14 – customers can view their service history.
/// </summary>
[ApiController]
[Route("api/service-records")]
public class ServiceRecordsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ServiceRecordsController(AppDbContext context) => _context = context;

    // ── GET /api/service-records ──────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var records = await _context.ServiceRecords
            .Include(sr => sr.Vehicle)
            .AsNoTracking()
            .OrderByDescending(sr => sr.ServiceDate)
            .Select(sr => new ServiceRecordDto
            {
                Id            = sr.Id,
                ServiceDate   = sr.ServiceDate,
                ServiceType   = sr.ServiceType,
                Description   = sr.Description,
                TotalCost     = sr.TotalCost,
                Status        = sr.Status,
                VehicleId     = sr.VehicleId,
                VehicleNumber = sr.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(records);
    }

    // ── GET /api/service-records/{id} ─────────────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var sr = await _context.ServiceRecords
            .Include(s => s.Vehicle)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sr == null) return NotFound(new { message = "Service record not found." });

        return Ok(MapToDto(sr));
    }

    // ── GET /api/service-records/vehicle/{vehicleId} ──────────────────────────
    /// <summary>All service records for a specific vehicle.</summary>
    [HttpGet("vehicle/{vehicleId:int}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId)
    {
        var exists = await _context.Vehicles.AnyAsync(v => v.Id == vehicleId);
        if (!exists) return NotFound(new { message = "Vehicle not found." });

        var records = await _context.ServiceRecords
            .Where(sr => sr.VehicleId == vehicleId)
            .Include(sr => sr.Vehicle)
            .OrderByDescending(sr => sr.ServiceDate)
            .AsNoTracking()
            .Select(sr => new ServiceRecordDto
            {
                Id            = sr.Id,
                ServiceDate   = sr.ServiceDate,
                ServiceType   = sr.ServiceType,
                Description   = sr.Description,
                TotalCost     = sr.TotalCost,
                Status        = sr.Status,
                VehicleId     = sr.VehicleId,
                VehicleNumber = sr.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(records);
    }

    // ── POST /api/service-records ─────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create(CreateServiceRecordDto dto)
    {
        var vehicleExists = await _context.Vehicles.AnyAsync(v => v.Id == dto.VehicleId);
        if (!vehicleExists)
            return BadRequest(new { message = $"Vehicle with ID {dto.VehicleId} does not exist." });

        var record = new ServiceRecord
        {
            ServiceDate = dto.ServiceDate,
            ServiceType = dto.ServiceType,
            Description = dto.Description,
            TotalCost   = dto.TotalCost,
            Status      = dto.Status,
            VehicleId   = dto.VehicleId
        };

        _context.ServiceRecords.Add(record);
        await _context.SaveChangesAsync();

        // Reload with vehicle for the response
        await _context.Entry(record).Reference(r => r.Vehicle).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = record.Id }, MapToDto(record));
    }

    // ── PUT /api/service-records/{id} ─────────────────────────────────────────
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, CreateServiceRecordDto dto)
    {
        var record = await _context.ServiceRecords.FindAsync(id);
        if (record == null) return NotFound(new { message = "Service record not found." });

        record.ServiceDate = dto.ServiceDate;
        record.ServiceType = dto.ServiceType;
        record.Description = dto.Description;
        record.TotalCost   = dto.TotalCost;
        record.Status      = dto.Status;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── DELETE /api/service-records/{id} ──────────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await _context.ServiceRecords.FindAsync(id);
        if (record == null) return NotFound(new { message = "Service record not found." });

        _context.ServiceRecords.Remove(record);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static ServiceRecordDto MapToDto(ServiceRecord sr) => new()
    {
        Id            = sr.Id,
        ServiceDate   = sr.ServiceDate,
        ServiceType   = sr.ServiceType,
        Description   = sr.Description,
        TotalCost     = sr.TotalCost,
        Status        = sr.Status,
        VehicleId     = sr.VehicleId,
        VehicleNumber = sr.Vehicle?.VehicleNumber ?? string.Empty
    };
}
