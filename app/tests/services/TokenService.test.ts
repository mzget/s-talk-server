import TokenService from "../../services/tokenService";

const tokenService = new TokenService();

test('test signToken with undefine', (done) => {
    tokenService.signToken(undefined, (err, result) => {
        expect(err).toBeInstanceOf(Error);
        done();
    });
});

test('test signToken with data', (done) => {
    tokenService.signToken({ username: "test", id: "1x24x" }, (err, result) => {
        expect(result).toBeDefined();
        done();
    });
});

test('test verify-token', (done) => {
    tokenService.ensureAuthorized("undefined", (err, result) => {
        if (result) {
            expect(result.success).toBeTruthy();
        }
        else {
            expect(err).toBeInstanceOf(Error);
        }
        done();
    });
});

test('test verify-token with data', (done) => {
    const testdata = { username: "test", id: "1x24x" };
    tokenService.signToken(testdata, (err, result) => {
        tokenService.ensureAuthorized(result, (err, data) => {
            if (data) {
                expect(data.success).toBeTruthy();
                expect(data.decoded).toMatchObject(testdata);
            }
            else {
                expect(err).toBeInstanceOf(Error);
            }
            done();
        });
    });
});