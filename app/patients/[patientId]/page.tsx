import Workspace from '../../workspace';
export const dynamic='force-dynamic';
export default async function PatientPage({params}:{params:Promise<{patientId:string}>}){
  const { patientId } = await params;
  return <Workspace patientId={patientId}/>;
}
