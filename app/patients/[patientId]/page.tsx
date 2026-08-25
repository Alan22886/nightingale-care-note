import Workspace from '../../workspace';
export const dynamic='force-dynamic';
export default async function PatientPage({params}:{params:Promise<{patientId:string}>}){await params;return <Workspace/>;}
