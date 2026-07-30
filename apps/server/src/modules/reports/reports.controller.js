export function createReportsController(service) {
  return {
    overview(request, response) {
      response.json(service.getOverview(request.validatedQuery));
    },
    async excel(request, response) {
      const { start, end } = request.validatedQuery;
      const workbook = await service.exportExcel({ start, end });
      response
        .set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="dd-auto-spa-report-${start}-to-${end}.xlsx"`,
          'Cache-Control': 'no-store',
        })
        .send(workbook);
    },
  };
}
