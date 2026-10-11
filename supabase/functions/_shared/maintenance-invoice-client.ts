// Render one invoice per request so font/PDF work cannot exhaust the billing worker CPU budget.
export async function requestMaintenancePdf(base:string,token:string,invoiceId:string):Promise<{name:string;content:string;buyerName:string;invoiceNumber:string}> {
 const response=await fetch(base+'/functions/v1/maintenance-invoice-renderer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({invoice_id:invoiceId}),signal:AbortSignal.timeout(30000)});
 const body=await response.json();
 if(!response.ok||body.success!==true||!body.content||!body.name||!body.buyerName||!body.invoiceNumber)throw Error('Maintenance invoice unavailable: '+String(body.error||response.status));
 return body;
}
