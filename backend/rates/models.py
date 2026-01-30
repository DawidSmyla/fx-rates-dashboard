from django.db import models

class ExchangeRate(models.Model):
    currency = models.CharField(max_length=8)
    code = models.CharField(max_length=4)
    rate = models.DecimalField(max_digits=12, decimal_places=6)
    effective_date = models.DateField()

    class Meta:
        unique_together = ("code", "effective_date")
        ordering = ["-effective_date", "code"]

    def __str__(self):
        return f"{self.code} @ {self.effective_date}: {self.rate}"