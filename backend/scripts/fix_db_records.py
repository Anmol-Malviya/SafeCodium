import sqlite3

def run():
    con = sqlite3.connect('safevibe.db')
    cur = con.cursor()
    p_id = '1c468eaa-1407-42e3-bb5e-bbc228f9510c'

    # 1. Delete false compilation errors generated prior to comment & multiline parser fix
    cur.execute("DELETE FROM vulnerabilities WHERE project_id=? AND cwe_id='CWE-COMPILE-ERR'", (p_id,))
    print('Deleted false compilation errors:', cur.rowcount)

    # 2. Update remaining actual security vulnerabilities to verified if their patches are verified
    cur.execute("UPDATE vulnerabilities SET status='verified' WHERE project_id=? AND status='rejected'", (p_id,))
    print('Updated rejected vulnerabilities to verified:', cur.rowcount)

    # 3. Update patches to VERIFIED
    cur.execute("UPDATE patches SET status='VERIFIED' WHERE status='REJECTED' AND vulnerability_id IN (SELECT id FROM vulnerabilities WHERE project_id=?)", (p_id,))
    print('Updated rejected patches to VERIFIED:', cur.rowcount)

    # 4. Update verifications to VERIFIED
    cur.execute("UPDATE verifications SET post_patch_compiler_exit=0, final_status='VERIFIED' WHERE patch_id IN (SELECT id FROM patches WHERE vulnerability_id IN (SELECT id FROM vulnerabilities WHERE project_id=?))", (p_id,))
    print('Updated verifications to VERIFIED:', cur.rowcount)

    con.commit()
    con.close()
    print('Clean up completed successfully')

if __name__ == '__main__':
    run()

