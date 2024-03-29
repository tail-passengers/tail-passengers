from django.db import models


class User(models.Model):
    name = models.CharField(max_length=10)
    age = models.IntegerField()
    gender = models.CharField(max_length=10)
    is_black_hole = models.BooleanField()
