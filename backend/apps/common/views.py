from rest_framework.views import APIView
from rest_framework.response import Response


class HealthCheckView(APIView):
    def get(self, request):
        # use DRF Response for proper content negotiation
        return Response({"status": "ok"})



# Create your views here.
