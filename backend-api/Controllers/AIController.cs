using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/ai")]
public class AIController : ControllerBase
{
    [HttpGet("predict")]
    public IActionResult Predict(int mileage, int year, int lastServiceMonths, int engineHealth, int batteryHealth)
    {
        var age = Math.Max(0, DateTime.Now.Year - year);
        var normalizedMileage = Math.Clamp(mileage / 1000, 0, 100);
        var servicePenalty = Math.Clamp(lastServiceMonths * 4, 0, 30);
        var enginePenalty = Math.Clamp(100 - engineHealth, 0, 100);
        var batteryPenalty = Math.Clamp(100 - batteryHealth, 0, 100);

        var riskScore = Math.Clamp(
            (normalizedMileage * 0.35) +
            (age * 4) +
            servicePenalty +
            (enginePenalty * 0.2) +
            (batteryPenalty * 0.15),
            0,
            100);

        var riskLevel = riskScore >= 70 ? "High Risk" : riskScore >= 40 ? "Medium Risk" : "Low Risk";
        var nextService = riskLevel == "High Risk"
            ? "Service immediately"
            : riskLevel == "Medium Risk"
                ? "Service within 2 weeks"
                : "Routine maintenance is sufficient";

        var brakeCondition = riskScore >= 70
            ? "Brakes need urgent inspection"
            : riskScore >= 40
                ? "Brakes should be inspected soon"
                : "Brakes look healthy";

        var engineCondition = engineHealth >= 80
            ? "Engine health is good"
            : engineHealth >= 50
                ? "Engine needs monitoring"
                : "Engine requires immediate service";

        var batteryCondition = batteryHealth >= 80
            ? "Battery health is strong"
            : batteryHealth >= 50
                ? "Battery may need replacement soon"
                : "Battery replacement recommended";

        var recommendedParts = new List<string>();
        if (riskScore >= 40) recommendedParts.Add("Brake Pads");
        if (engineHealth < 80) recommendedParts.Add("Engine Oil Filter");
        if (batteryHealth < 80) recommendedParts.Add("Battery");
        if (lastServiceMonths >= 6) recommendedParts.Add("Full Service Kit");
        if (recommendedParts.Count == 0) recommendedParts.Add("General Service Check");

        return Ok(new
        {
            riskLevel,
            vehicleAge = age,
            riskScore = Math.Round(riskScore, 1),
            nextServiceRecommendation = nextService,
            predictions = new
            {
                brakeCondition,
                engineCondition,
                batteryCondition
            },
            recommendedParts
        });
    }
}